import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import {TodoItem, Common} from './internal';
import * as glob from 'glob';
import { TodoMetadata } from '../interfaces/todoMetadata';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const exists = promisify(fs.exists);
const globAsync = promisify(glob);
let resolvedProjectDirectory: string;
let foundPaths: Map<string, string> = new Map();
export interface TodoPlusConfig {
    [fileUri: string]: {
        [id: string]: {
            created?: TodoItem['created'];
            updated?: TodoItem['updated'];
            customMetadata? : TodoItem['customMetadata'];
            metadata? : TodoMetadata;
        }
    };
}


export async function syncTodos(...todoItems: TodoItem[]) {
    const groups = todoItems.filter(t => !!t.id).reduce((obj, curr) => {
        const folderPath = path.join(curr.fileUri, '../');
        const arr = obj[folderPath] = obj[folderPath] || [];
        arr.push(curr);
        return obj;
    }, {} as { [index: string]: TodoItem[] });

    for (const folder of Object.keys(groups)) {
        const items = groups[folder];
        const configInfo = await getConfig(folder);
        let configPath = '';
        let config: TodoPlusConfig;
        if (configInfo) {
            configPath = configInfo.path;
            config = configInfo.config;
        } else {
            config = {};
            configPath = path.join(resolvedProjectDirectory, 'todoPlus.json');
        }
        const relativePath = path.relative(path.join(configPath, '../'), items[0].fileUri);
        const configItems = config[relativePath] || {};
        for (const item of items) {
            const configItem = configItems[item.id];
            if (configItem) {
                // Uninitialized item.
                if (!item.isSynced) {
                    // Sync config to item
                    Object.assign(item, configItem);                    
                } else {
                    if (item.updated > configItem.updated) {
                        const keys = ['updated','created','customMetadata', 'metadata'];
                        for (const configItemKey of keys) {
                            const configItemValue = configItem[configItemKey];
                            const todoItemValue = item[configItemKey];
                            if (todoItemValue !== undefined) {
                                configItem[configItemKey] = todoItemValue;
                            } else if (configItemValue !== undefined) {
                                item[configItemKey] = configItemValue;
                            }
                        }
                    }
                }
            } else if (item.canPersist) {
                configItems[item.id] = {
                    created: item.created,
                    updated: item.updated,
                    customMetadata:item.customMetadata && item.customMetadata.length ? item.customMetadata : undefined,
                    metadata: item.metadata,
                };
                config[relativePath] = configItems;
            }

        }
        await writeFile(configPath, JSON.stringify(config, null, 4), 'utf-8');
    }
}

export async function getConfig(startPath: string): Promise<{ config: TodoPlusConfig, path: string }> {
    const configPath = await findFile(startPath, resolvedProjectDirectory, 'todoPlus.json');
    if (configPath) {
        const data = await readFile(configPath, 'utf-8');
        let config = {};
        try {
            config = JSON.parse(data);
        } catch {
            config = {};
        }
        return { config, path: configPath };
    }
    return null;
}

export function initialize(projectDirectory: string) {
    resolvedProjectDirectory = projectDirectory;
    purge();
}

async function loadConfig(filePath: string): Promise<TodoPlusConfig> {
    return JSON.parse(await readFile(filePath, 'utf-8'));
}

async function purge() {
    const shouldPurge = Common.getEnvironmentSettings().purgeObsoleteOnStart;
    if (shouldPurge) {
        const pattern = `${resolvedProjectDirectory}/**/todoPlus.json`;
        const files = await globAsync(pattern);
        for (const file of files) {
            try {
                const config = await loadConfig(file);
                for (const fileUri of Object.keys(config)) {
                    const relativePath = path.join(path.dirname(file), fileUri);
                    if (await exists(relativePath)) {
                        const items = config[fileUri];
                        const text = await readFile(relativePath, 'utf-8');
                        for (const itemId of Object.keys(items)) {
                            if (text.indexOf(itemId) < 0) {
                                delete items[itemId];
                            }
                        }
                        if (Object.keys(items).length === 0) {
                            delete config[fileUri];
                        }
                    } else {
                        delete config[fileUri];
                    }
                }
                await writeFile(file, JSON.stringify(config, null, 4));
            } catch {
                continue;
            }
        }
    }
}

export async function findFile(startPath: string, endPath: string, fileName: string, originalPath: string = startPath) {
    if (foundPaths.has(originalPath)) {
        return foundPaths.get(originalPath);
    }
    const resolvedPath = path.join(startPath, fileName);
    const match = await exists(resolvedPath);
    if (match) {
        foundPaths.set(originalPath, resolvedPath);
        return resolvedPath;
    } else if (path.resolve(startPath) === path.resolve(endPath)) {
        return null;
    }
    return await findFile(path.join(startPath, '../'), endPath, fileName, originalPath);
}