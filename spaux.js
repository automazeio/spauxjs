/* jshint esversion: 9 */
(function (spaux, undefined) {

  const postfetchEvent = (eventInfo) => {
    const targetElement = document.querySelector(eventInfo.detail.target);
    // targetElement.setAttribute('aria-busy', false);
    targetElement.removeAttribute('aria-label');

    targetElement.classList.remove('spaux-in');
    targetElement.classList.add('spaux-out');
    window.dispatchEvent(new CustomEvent("spaux:postfetch", eventInfo));

    document.head.querySelectorAll('.spaux-remove').forEach(element => {
      element.remove();
    });
  };

  /**
   * It fetches a URL, replaces the contents of a target element with the response,
   * and then attaches events to the new content
   * @param {string} url - the url to fetch
   * @param {string} target - the id of the element to replace (default: ':root')
   * @param {boolean} [append=false] - if true, the content will be appended to the target, otherwise it will replace the target
   * @param []
   *  - method {string}  [get] - the HTTP method to use
   *  - callback {string} - a function to call after the content is placed
   */
  spaux.isFetching = false;
  spaux.fetchToFrame = (url, target, { append = false, method = 'get', callback } = {}) => {
    url = new URL(url, document.location.href).href;

    const targetSelector = target === ':root' ? ':root' : `#${target}`;
    const targetElement = document.querySelector(targetSelector);
    // targetElement.setAttribute('aria-busy', true);
    targetElement.setAttribute('aria-label', 'Loading...');

    const postFetchCallback = () => {
      if (callback) {
        setTimeout(callback, 500);
      }
      attachEvents();
    };

    const eventInfo = { detail: { url, method, target: targetSelector } };

    document.querySelector(eventInfo.detail.target).classList.remove('spaux-out');
    document.querySelector(eventInfo.detail.target).classList.add('spaux-in');
    window.dispatchEvent(new CustomEvent("spaux:prefetch", eventInfo));

    if (spaux.isFetching) { return; }
    spaux.isFetching = true;

    fetch(url, { method: method })
      .then((response) => response.text())
      .then((html) => {
        html = html.replace(/(\s|\n)(const|let) /gmi, ' var ');
        // check that the target exists
        if (!targetElement) {
          console.error(`target ${target} not found`);
          return;
        }

        // replace the <head> but keep styles until the end
        if (target === ':root' || (!append && url !== document.location.href)) {
          const headRegex = /<head>((.|\n)*)<\/head>/gmi;
          let m = headRegex.exec(html);
          if (m !== null) {
            _loadContent(_htmlToElements(m[1]), 0, document.head, false);
          }
        }

        // replace the whole document?
        if (target === ':root') {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          document.body.innerHTML = '';
          document.body.className = '';
          setTimeout(() =>{
            document.body.className = doc.body.className;
            document.body.innerHTML = doc.body.innerHTML;
            postFetchCallback();
            postfetchEvent(eventInfo);
          }, 150);
          return;
        }

        // replace the target
        // let contentRegex = new RegExp(`<(\\w+) id="${target}">((.|\\n)*)`, 'gmi');
        let contentRegex = new RegExp(`<(\\w+)(.*?) id="${target}"(.*?)>((.|\\n)*)`, 'gmi');
        m = contentRegex.exec(html);
        if (m === null) {
          // use body or all content if no body found
          contentRegex = /<body((.|\n)*)?>((.|\n)*)<\/body>/gmi;
          m = contentRegex.exec(html);
          if (m !== null) html = m[0];
        } else {
          const tag = m[1];
          contentRegex = new RegExp(`^(<${tag}(.*?) id="${target}"(.*?)>((.|\\n)*)</${tag}>)|</${tag}>$`, 'gmi');
          m = contentRegex.exec(m[0]);
          html = `${m.slice(-2)[0]}`.split(`</${tag}>`).slice(0, -1).join(`</${tag}>`);
        }
        setTimeout(() =>{
          spaux.placeHTML(html, targetSelector, append).then(postFetchCallback);
          postfetchEvent(eventInfo);
        }, 200);
      }).catch((error) => {
        // alert(error);
        console.log(error);
        postfetchEvent(eventInfo);
      })
      .finally(() => {
        setTimeout(() => {
          spaux.isFetching = false;
        }, 300);
      });
  };

  /**
   * It fetches the URL from the `href` attribute of the clicked element, and replaces the contents of
   * the element with the `id` attribute of the `data-spaux-target` attribute of the clicked element
   * with the response
   * @param event - The event object that triggered the click.
   * @returns A function that is called when a click event is fired.
   */
  const onClick = (event) => {
    event.preventDefault();
    let el = event.target;

    // loop until you find the href
    while (el && !el.hasAttribute('href')) {
      el = el.parentNode;
      if (el.nodeName == 'BODY') return;
    }
    const target = el.getAttribute('data-spaux-target') || ':root';
    const method = el.getAttribute('data-spaux-method') || 'get';
    const append = el.hasAttribute('data-spaux-append') && el.getAttribute('data-spaux-append') !== 'false';
    const render = !el.hasAttribute('data-spaux-render') || el.getAttribute('data-spaux-render') !== 'false';
    const cache = !el.hasAttribute('data-spaux-cache') || el.getAttribute('data-spaux-cache') !== 'false';
    const url = new URL(el.getAttribute('href'), document.location.href).href;

    if (el.target && el.target !== '_self') {
      window.open(url, el.target);
      return;
    }
    // ----------------------------------------
    // find the target container to attach an "active" class
    try {
      let parent = el;
      while (parent && (parent.nodeName == 'A' || parent.nodeName == 'LI')) {
        parent = parent.parentNode;
        if (parent.nodeName == 'BODY') break;
      }
      parent.querySelectorAll('a').forEach(element => {
        element.classList.remove('spaux-active');
      });
      el.classList.add('spaux-active');
    } catch (err) { }
    // ----------------------------------------

    // ping only
    if (!render) {
      fetch(url, { method: method })
        .then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.error(error);
        });
      return;
    }

    const targetSelector = document.querySelector(target === ':root' ? target : `#${target}`);
    const state = {
      title: document.title,
      html: targetSelector.innerHTML.trim(),
      method,
      target,
      cache,
      url: document.location.href,
      scrollY: window.scrollY,
      scrollX: window.scrollX,
    };

    spaux.fetchToFrame(url, target, {
      append: append,
      method: method,
      callback: () => {
        const changeInterval = setInterval(() => {
          if (targetSelector.innerHTML !== '' && state.html !== targetSelector.innerHTML.trim()) {
            clearInterval(changeInterval);
            state.html = targetSelector.innerHTML.trim();
            state.url = url;
            if (append && url == document.location.href) {
              history.replaceState(state, url, url);
            } else {
              history.pushState(state, url, url);
            }
          }
        }, 1);
      }
    });
  };

  /**
   * It takes the form's data, sends it to the server, and replaces the form with the server's response
   * @param event - The event object that triggered the submit.
   */
  const onSubmit = (event) => {
    event.preventDefault();
    const el = event.target;
    const target = el.getAttribute('data-spaux-target') || el.getAttribute('data-spaux-id');
    const append = el.hasAttribute('data-spaux-append') && el.getAttribute('data-spaux-append') !== 'false';
    let targetSelector = target === ':root' ? target : `#${target}`;
    if (target === el.getAttribute('data-spaux-id')) {
      targetSelector = `[data-spaux-id="${target}"]`;
    }

    const callback = window[el.getAttribute('data-spaux-callback')] || function () { el.reset(); };
    fetch(el.action, {
      method: el.method || 'post',
      body: new URLSearchParams(new FormData(el)),
    })
      .then((response) => response.text())
      .then((html) => {
        if (html === '') {
          callback(el);
          return;
        }
        spaux.placeHTML(html, targetSelector, append).then(() => {
          callback(el);
          console.info('form replaced');
        });
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };


  /**
   * ↓ ========================================================== ↓
   * The below is based on Gilles Migliori's code from:
   * https://github.com/migliori/ajax-fetch-data-loader by
   *
   * Additions: no loading remote js/css more than once.
   */
  spaux.remoteResources = [];

  setInterval(() => {
    spaux.remoteResources = [];
  }, 300 * 1000);

  /**
   * It takes a string of HTML and returns an array of DOM nodes
   * @param {string} html the HTML/Javascript returned by fetch()
   * @return {array} a table with the html nodes then the scripts at the end
   */
  const _htmlToElements = function (html) {
    var template = document.createElement('template');
    template.innerHTML = html;

    const nodes = template.content.childNodes,
      nodesArray = [],
      scriptsArray = [];

    for (var i in nodes) {
      if (nodes[i].nodeType == 1) { // get rid of the whitespace text nodes
        if (nodes[i].nodeName === 'SCRIPT') {
          scriptsArray.push(nodes[i]);
        } else {
          nodesArray.push(nodes[i]);
        }
      }
    }

    return nodesArray.concat(scriptsArray);
  };

  /**
   * Recursive function that loads each node into the container and then loads the scripts
   * It takes an array of DOM elements, loops through them, and appends them to the DOM
   * @param {string} data - The data to be loaded.
   * @param {integer} index - The index of the current element in the array.
   * @param {string} container - The container where the content will be loaded.
   * @param {boolean} true on success after recursion
   * @return {boolean} true on success after recursion
   */
  const _loadContent = function (data, index, container, appendData) {
    if (index === 0 && !appendData) {
      if (container === document.head) {
        // remove all head items except form styles...
        document.head.querySelectorAll('link[rel="stylesheet"], style').forEach(element => {
          element.classList.add('spaux-remove'); // mark for deletion later
        });
        document.head.querySelectorAll(':not(link[rel="stylesheet"]):not(style)').forEach(element => {
          element.remove();
        });
      } else {
        document.querySelector(container).innerHTML = '';
      }
    }
    var item, minified;
    if (index <= data.length) {
      var element = data[index];

      if (element !== undefined && element.nodeName == 'SCRIPT') {
        item = document.createElement(element.nodeName.toLowerCase());
        if (element.type) item.type = element.type;

        // clone attributes
        Array.prototype.forEach.call(element.attributes, function (attr) {
          item.setAttribute(attr.nodeName, attr.nodeValue);
        });
        if (element.src != '') {
          if (spaux.remoteResources.includes(element.src) === false) {
            spaux.remoteResources.push(element.src);
            item.src = element.src;
            item.onload = function () {
              _loadContent(data, index + 1, container);
            };
            document.head.appendChild(item);
          }
        } else {
          minified = element.text.replace(/[^a-z0-9]/gim, '');
          if (spaux.remoteResources.includes(minified) === false) {
            spaux.remoteResources.push(minified);
            item.text = element.text;
            if (document.body) document.body.appendChild(item);
          }
          _loadContent(data, index + 1, container);
        }
      }

      else if (element !== undefined && element.nodeName == 'LINK' && element.rel == 'stylesheet') {
        item = document.createElement(element.nodeName.toLowerCase());
        if (element.type) item.type = element.type;

        // clone attributes
        Array.prototype.forEach.call(element.attributes, function (attr) {
          item.setAttribute(attr.nodeName, attr.nodeValue);
        });

        if (spaux.remoteResources.includes(element.href) === false) {
          spaux.remoteResources.push(element.href);
          item.href = element.href;
          item.onload = function () {
            _loadContent(data, index + 1, container);
          };
          item.classList.remove('x-spaux-remove');
          document.head.appendChild(item);
        } else {
          _loadContent(data, index + 1, container);
        }
      }

      else {
        if (element !== undefined) {
          if (container === document.head) {
            document.head.appendChild(element);
          } else {
            document.querySelector(container).appendChild(element);
          }
        }
        _loadContent(data, index + 1, container);
      }
    } else {
      return true;
    }
  };
  /**
   * ↑ ========================================================== ↑
   */

  /**
   * It attaches event listeners to all links and forms on the page
   * @param {string} element - The element to attach the events to. If not provided, it will attach to the
   * document.
   */
  const attachEvents = (element) => {
    element = element || document;
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }
    // const match = `a:not([data-spaux-disable]):not([href*="//${window.location.host}"])`;
    element.querySelectorAll('a:not([data-spaux-disable])').forEach((el) => {
      el.removeEventListener('click', onClick);
      el.addEventListener('click', onClick);
    });
    element.querySelectorAll('form:not([data-spaux-disable])').forEach((el) => {
      el.setAttribute('data-spaux-id', `spaux#${Math.random().toString(36).substring(2)}`);
      el.removeEventListener('submit', onSubmit);
      el.addEventListener('submit', onSubmit);
    });
  };

  /* Setting up the initial state of the page, and attaching event listeners to the page. */
  spaux.init = () => {
    localStorage.setItem('originalState', JSON.stringify({
      title: document.title,
      html: document.querySelector('body').innerHTML.trim(),
    }));

    attachEvents();

    window.addEventListener('popstate', (event) => {
      event.preventDefault();
      let targetSelector = ':root';

      if (event.state === null) {
        if (localStorage.getItem('originalState')) {
          const originalState = JSON.parse(localStorage.getItem('originalState'));
          document.title = originalState.title;
          spaux.placeHTML(originalState.html, 'body').then(() => {
            // console.log('restored original page');
          });
        }
        return;
      }
      if (event.state) {
        targetSelector = `#${event.state.target}`;
        if (event.state.cache) {
          spaux.placeHTML(event.state.html, targetSelector).then(() => {
            window.scrollTo(event.state.scrollX, event.state.scrollY);
            document.title = event.state.title;
          });
        } else {
          spaux.fetchToFrame(event.state.url, event.state.target, {
            append: false,
            method: event.state.method,
            callback: () => {
              window.scrollTo(event.state.scrollX, event.state.scrollY);
              document.title = event.state.title;
            }
          });
        }
      }

      attachEvents(targetSelector);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    spaux.init();
  });

  /**
   * the main function to load the fetched content into the HTML container
   *
   * @param {string} data the HTML/Javascript returned by fetch()
   * @param {string} container the container target selector. ie: '#ajax-target'
   * @param {boolean} appendData choose whether to add the content to the end of the container or to replace it
   * @return {boolean} true on success
   */
  spaux.placeHTML = async function (data, container, appendData = false) {
    data = data.trim().substring(0, 1) === '<' ? data : `<div>${data}</div>`;
    return _loadContent(_htmlToElements(data), 0, container, appendData);
  };

}((window.spaux = window.spaux || {})));
