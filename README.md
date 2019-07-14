![Todo Plus](media/icon.png)

# Todo Plus

Todo Plus is a Visual Studio Code extension that provides an easy way to view, manage and create todo items w/ metadata across a project. All default Visual Studio Code languages are supported out-of-the-box and any comment (single or block) that starts with `TODO:` will be picked up automatically by the Todo Plus Explorer (in the side-bar). Similarly starting/typing a comment in a document followed by `TODO:` will create a "Todo Plus" comment that can store metadata.

## Key Features
- Comments created while using Todo Plus will automatically store metdata in a todoPlus.json at your project root.
- Reminders can be added to todos.
- Custom metadata can be added to todos.
- For todos created w/ Todo Plus, created and updated dates are preserved.
- Additional language support can be added by editing user or workspace settings for Todo Plus - see todoPlus.languages setting.

## Custom Language Support (todoPlus.languages setting)
Custom language support can be added to Todo Plus by providing an array JSON objects describing how comments are formatted in the given language(s) and the file extensions associated with the language.

If for instance TypeScript wasn't supported (which is) an example of the definition would look like this:
```json
{
  "lineComment": "//",
  "extensions": [".ts"],
  "blockComment": ["/*","*/"]
}
```

## Requirements
Person + Computer + Visual Studio Code

## Extension Settings

- todoPlus.purgeObsoleteOnStart, defaults to `true` and determines whether obsolete items will be cleaned out from todoPlus.json
- todoPlus.languages, custom language support can be added here.

## Known Issues

None currently.

## Release Notes

This is the initial release of `Todo Plus`.

### 1.0.0

Initial release.
