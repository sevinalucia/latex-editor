var config  = {
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "codemirror": {
    "editor": null,
    "options": {
      "indentUnit": 2,
      "tabMode": "indent",
      "lineNumbers": true,
      "lineWrapping": true,
      "matchBrackets": true,
      "mode": "text/x-stex"
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      var context = document.documentElement.getAttribute("context");
      if (context === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(function () {
          config.storage.write("interface.size", {
            "width": window.innerWidth || window.outerWidth,
            "height": window.innerHeight || window.outerHeight
          });
        }, 300);
      }
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.documentElement.style.width = "770px";
              document.documentElement.style.height = "570px";
            }
            /*  */
            chrome.runtime.connect({"name": config.port.name});
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "load": function () {
    var reload = document.getElementById("reload");
    var support = document.getElementById("support");
    var donation = document.getElementById("donation");
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    }, false);
    /*  */
    support.addEventListener("click", function () {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "app": {
    "process": {
      "file": function (file, callback) {
        if (!file) return;
        /*  */
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function (e) {
          var content = e.target.result;
          if (content) callback(content);
        };
      }
    },
    "show": {
      "error": {
        "message": function (e) {
          var pdf = document.getElementById("pdf");
          var fileio = document.getElementById("fileio");
          var compile = document.getElementById("compile");
          /*  */
          fileio.disabled = false;
          pdf.removeAttribute("disabled");
          compile.removeAttribute("disabled");
          /*  */
          var pre = document.createElement("pre");
          var output = document.getElementById("output");
          pre.textContent = JSON.stringify(e, null, 2);
          output.textContent = '';
          output.appendChild(pre);
        }
      }
    },
    "compile": {
      "generator": null,
      "to": {
        "latex": {
          "document": function (txt) {
            var pdf = document.getElementById("pdf");
            var output = document.getElementById("output");
            var fileio = document.getElementById("fileio");
            var compile = document.getElementById("compile");
            var baseURL = (new URL("vendor/latexjs/", location.href)).href;
            /*  */
            fileio.disabled = true;
            pdf.setAttribute("disabled", '');
            compile.setAttribute("disabled", '');
            output.textContent = "Loading, please wait...";
            /*  */
            window.setTimeout(function () {
              try {
                var iframe = document.createElement("iframe");
                var generator = new latexjs.HtmlGenerator({"hyphenate": false});
                /*  */
                output.textContent = '';
                iframe.id = "app-iframe";
                config.storage.write("code", window.btoa(txt));
                config.app.compile.generator = latexjs.parse(txt, {"generator": generator});
                /*  */
                iframe.onload = function () {
                  var style = iframe.contentWindow.document.createElement("style");
                  style.setAttribute("type", "text/css");
                  style.textContent = `
                    body {
                      font-size: 100%;
                      font-family: inherit;
                    }
                    .body {
                      margin: 0 5%;
                      grid-column: inherit;
                    }
                  `;
                  /*  */
                  fileio.disabled = false;
                  pdf.removeAttribute("disabled");
                  compile.removeAttribute("disabled");
                  /*  */
                  var base = iframe.contentWindow.document.createElement("base");
                  base.href = baseURL;
                  iframe.contentWindow.document.head.appendChild(base);
                  /*  */
                  iframe.contentWindow.document.head.appendChild(config.app.compile.generator.stylesAndScripts(baseURL));
                  iframe.contentWindow.document.body.appendChild(config.app.compile.generator.domFragment());
                  iframe.contentWindow.document.head.appendChild(style);
                };
                /*  */
                output.appendChild(iframe);
              } catch (e) {
                config.app.show.error.message(e);
              }
            }, 300);
          }
        }
      }
    },
    "start": function () {
      const pdf = document.getElementById("pdf");
      const input = document.getElementById("input");
      const fileio = document.getElementById("fileio");
      const compile = document.getElementById("compile");
      /*  */
      config.codemirror.editor = CodeMirror.fromTextArea(input, config.codemirror.options);
      try {
        if (config.storage.read("code") !== undefined) {
          var code = window.atob(config.storage.read("code"));
          config.codemirror.editor.setValue(code);
          window.setTimeout(function () {
            compile.click();
          }, 300);
        } else {
          fetch("resources/test.txt").then(function (e) {return e.text()}).then(function (e) {
            if (e) {
              config.codemirror.editor.setValue(e);
              window.setTimeout(function () {
                compile.click();
              }, 300);
            }
          }).catch(function () {
            config.app.show.error.message("Error: could not find the input .tex file!");
          });
        }
      } catch (e) {config.app.show.error.message(e)}
      /*  */
      pdf.addEventListener("click", function () {
        const iframe = document.getElementById("app-iframe");
        if (iframe) iframe.contentWindow.print();
      });
      /*  */
      compile.addEventListener("click", function (e) {
        var txt = config.codemirror.editor.getValue();
        config.app.compile.to.latex.document(txt);
      }, false);
      /*  */
      fileio.addEventListener("change", function (e) {
        config.app.process.file(e.target.files[0], function (txt) {
          config.codemirror.editor.setValue(txt);
        });
      }, false);
    }
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
window.addEventListener("dragover", function (e) {e.preventDefault()});
window.addEventListener("drop", function (e) {if (e.target.id !== "fileio") e.preventDefault()});
