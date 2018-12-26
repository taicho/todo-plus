import { LanguageInfo } from "../interfaces/languageInfo";
import { Common} from './internal';
import * as vscode from 'vscode';
import * as path from 'path';
import { LanguageContribution } from "../interfaces/languageContribution";
import * as util from 'util';
import * as fs from 'fs';
import * as minimatch from 'minimatch';
import * as stripJson from 'strip-json-comments';
const exists = util.promisify(fs.exists);
const readFile = util.promisify(fs.readFile);
import * as glob from 'glob';

let languages: LanguageInfo[] = [];
let coreLanguages: LanguageInfo[] = [];
let languageCache: Map<string, LanguageInfo> = new Map();
let extensionRoot = path.join(vscode.env.appRoot, 'extensions');
let globAsync = util.promisify(glob);
function addCoreLanguage(info: LanguageInfo) {
    coreLanguages.push(info);
}

export function isFileSupported(filePath: string) {
    return !!getLanguageInfoFromFile(filePath);
}

export function getLanguages() {
    return languages;
}

export function filePathMatchesExtension(filePath: string, ext: string) {
    const extension = path.extname(filePath);
    return matchesExtension(extension, ext);
}

export function matchesExtension(pathExtension: string, ext: string) {
    return minimatch(pathExtension, ext);
}


async function registerLanguages() {
    const packages = await globAsync(`${extensionRoot}/*/package.json`);
    for (const extensionPackagePath of packages) {
        const contributions = await getLanguageContributions(extensionPackagePath);
        if (contributions && contributions.length) {
            for (const contribution of contributions) {
                if (contribution.configuration) {
                    const config = await getLanguageConfiguration(extensionPackagePath, contribution.configuration);
                    if (config && config.comments && config.comments.blockComment) {
                        if (contribution.extensions && contribution.extensions.length) {
                            addCoreLanguage({
                                extensions: contribution.extensions,
                                lineComment: config.comments.lineComment,
                                blockComment: config.comments.blockComment,
                            });
                        }
                    }
                }
            }
        }
    }
}

async function getLanguageContributions(extensionPackagePath: any): Promise<LanguageContribution[]> {
    const packageJson = await readJsonSafe(extensionPackagePath);
    if (packageJson && packageJson.contributes) {
        return packageJson.contributes.languages || [];
    }

}

async function readJsonSafe(filePath: string) {
    if (await exists(filePath)) {
        const data = stripJson(await readFile(filePath, 'utf8'));
        try {
            //  Try parsing *PROPER* json.
            return JSON.parse(data);
        } catch {
            // ...if that fails try eval on it since some VSCode language configs aren't serialized JSON...
            return eval(`(function(){return ${data};})()`);
        }
    }
}

async function getLanguageConfiguration(extensionPackagePath: any, relativePath: string): Promise<vscode.LanguageConfiguration> {
    try {
        return await readJsonSafe(path.join(path.dirname(extensionPackagePath), relativePath));
    } catch {
        return null;
    }
}

function buildLanguageInfo() {
    let customLanguages = Common.getEnvironmentSettings().languages || ([] as LanguageInfo[]).filter((f) => isValidLanguageInfo(f));
    for (const lang of customLanguages) {
        for (const ext of lang.extensions) {
            const extShort = ext.substring(1);
            languageCache.delete(extShort);
        }
    }
    languages = customLanguages.concat(coreLanguages);
}

function isValidLanguageInfo(info: LanguageInfo) {
    let valid = true;
    if (!info.extensions || !info.extensions.length) {
        valid = false;
    }
    if (!info.lineComment && !info.blockComment) {
        valid = false;
    }
    return valid;
}

export async function initialize() {
    await registerLanguages();
    buildLanguageInfo();
}

vscode.workspace.onDidChangeConfiguration((e) => {
    buildLanguageInfo();
});

export function getLanguageInfoFromFile(filePath: string) {
    const extension = path.extname(filePath);
    if (extension) {
        let result: LanguageInfo = languageCache.get(extension);
        if (result) {
            return result;
        }
        for (const language of languages) {
            for (const ext of language.extensions) {
                if (matchesExtension(extension, ext)) {
                    result = language;
                    languageCache.set(extension, result);
                    return result;
                }
            }
        }

    }
}
