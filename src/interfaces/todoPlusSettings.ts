import { LanguageInfo } from "./languageInfo";

export interface TodoPlusSettings {
    purgeObsoleteOnStart: boolean;
    languages: LanguageInfo[];
}