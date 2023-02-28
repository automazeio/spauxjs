<img src="https://github.com/automazeio/spauxjs/raw/main/docs/assets/logo.png" style="height:48px">

# spaux.js
### Make multi-page apps feel like single-page applications.

“SPAUX” (/spoʊ/) is a lightweight JavaScript utility (2.26KB minified and gzipped) Its purpose is to help developers create multi-page applications that behave and feel like single-page applications single-page applications. The name SPAUX is a combination of "SPA" (Single Page Application) and "FAUX" (meaning fake).

With SPAUX.js, page transitions and form submissions become faster, and page sections can be broken down into components without requiring changes to the code you write. This approach enables you to develop modern web applications that transmit HTML instead of JSON over the network while still being able to render templates on the server and work with any programming language.

Responses are cached for faster response times, the browser history state is handled automatically, and page titles are replaced as needed. The result is a web application that provides the speed and responsiveness of a traditional single-page application without changing your development process.

Installation
Start with creating an index.html file and include spaux.js with:

<!-- include spaux.js -->
<script src="//cdn.jsdelivr.net/gh/automazeio/spauxjs/spaux.min.js"></script>

### That's it!

All same-domain links and form submissions will be handled by spaux.js. The default behaviour for links is to replace `:root` container, and for forms, to replace the form's container (you can disable this behaviour by adding `data-spaux-disable` to the link or form).

### [See Docs / Examples](https://automazeio.github.io/spauxjs/)

## Attributes

- `data-spaux-method="..."` - sets the fetch call method to get/post/put/patch/delete (defaults to `GET`)
- `data-spaux-target="..."` - instructs spaux.js where to get and render the returned content (defaults to :root element)
- `data-spaux-cache="false"` - instructs spaux.js not to cache the result (useful for dynamic pages)
- `data-spaux-render="false"` - instructs spaux.js not to render the content (useful for CRUD or API calls)
- `data-spaux-append` - (flag) instructs spaux.js to append the returned content, rather than replace it
- `data-spaux-disable` - (flag) disables spaux.js for that link/form


## Hooks

SPAUX.js will trigger events on the window object when it starts and finishes fetching content. You can use these events to add custom behaviour to your site.away The `event.detail` contains the link element that was clicked, the url and the call method (get/post/put/patch/delete).

#### Example:
```js
window.addEventListener('spaux:prefetch', (event) => {
  document.querySelector(event.detail.target).classList.add('is-animating');
});

window.addEventListener('spaux:postfetch', (event) => {
  document.querySelector(event.detail.target).classList.remove('is-animating');
});

```

### License

SPAUX is distributed under the Apache Software License. See the LICENSE.txt file in the release for details.

Let us know what you think :)
