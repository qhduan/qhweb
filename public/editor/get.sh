cat "src/Markdown.Converter.js" "src/Markdown.Sanitizer.js" "src/Markdown.Editor.js" "src/Markdown.Extra.js" "src/Markdown.Plugins.js" "src/highlight.pack.js" > markdown.js

uglifyjs markdown.js -m > markdown.min.js

