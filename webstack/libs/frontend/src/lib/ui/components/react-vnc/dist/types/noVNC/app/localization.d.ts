export class Localizer {
    language: string;
    _dictionary: any;
    setup(supportedLanguages: any, baseURL: any): Promise<void>;
    _setupLanguage(supportedLanguages: any): void;
    _setupDictionary(baseURL: any): Promise<void>;
    get(id: any): any;
    translateDOM(): void;
}
export const l10n: Localizer;
declare function _default(id: any): any;
export default _default;
