# cachehitratio

rollup background.js --file bundle.js --format iife

A Chrome browser extension that shows the cache hit ratio for objects on
a page served by Fastly.

When you navigate to a page that is served by Fastly, a little red
percentage symbol is highlighted in the toolbar to the right of the
omnibox. As the browser loads all the objects on that page from the
network, cachehitratio records whether they were a Fastly cache hit or
miss. It shows a cache hit ratio as a percentage.

For example, navigating to https://www.fastly.com/ gives:

![Screenshot](images/screenshot.png)

## Installation

Visit https://fastly.us/cachehitratio and click on "Add to Chrome".

## Development

You should have access to the Fastly GitHub organization. Then run:

```bash
$ git clone git@github.com:fastly/chrome-extension-cachehitratio.git
Cloning into 'chrome-extension-browser-cache-hit-ratio'...
...
```

To use, visit chrome://extensions/ in your Chrome browser. Select
"Developer mode" then "Load an unpacked extension" and select the
chrome-extension-cachehitratio directory. You're all good to go!

## Contributing

Send a pull request. Run ESLint first:

```bash
$ yarn install
yarn install v0.27.5
[1/4] Resolving packages...
[2/4] Fetching packages...
[3/4] Linking dependencies...
[4/4] Building fresh packages...
Done in 1.84s.
$ yarn run eslint
yarn run v0.27.5
$ ./node_modules/eslint/bin/eslint.js background.js
Done in 0.48s.
```

## License

This extension is available as open source under the terms of the [MIT
License](http://opensource.org/licenses/MIT).

## Future

Is this useful? Let me know! Léon Brocard <<leon@fastly.com>>
