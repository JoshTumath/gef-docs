const fs = require('fs');
const nunjucks = require('nunjucks');
const crypto = require('crypto');

var count = 0;
function counter() {
  return count++;
}

module.exports = function (eleventyConfig) {
  const data = {
    site: require('./src/_data/site.json')
  };
  const hljs = require('highlight.js');
  const cheerio = require('cheerio');

  var shortcodes = {
    mark: {
      render: function (attrs) {
        var char = (attrs.is === 'good') ? '✓' : (attrs.is === 'bad') ? '✕' : '?';
        return `
          <div class="circular circular__${attrs.is}" aria-hidden="true">${char}</div>
        `;
      }
    },
    icon: {
      render: function (attrs) {
        return `
          <svg class="${attrs.class}"><use xlink:href="${data.site.basedir}static/images/gel-icons-all.svg#${attrs.name}" style="${attrs.style}"></use></svg>
        `;
      }
    },
    include: {
      render: function (attrs) {
        var filePath = attrs.src;
        var fileContent = fs.readFileSync('./src/' + filePath, 'utf8');
        if (fileContent.substr(0, 3) === '---') {
          fileContent = fileContent.replace(/^---([\s\S]+?)---/, '<!-- $1 -->');
        }

        var renderedContent = nunjucks.renderString(fileContent, data);

        return `
          <div class="gel-demo">${renderedContent}</div>
        `;
      }
    }
  }

  const md = require('markdown-it')({
    html: true,
    breaks: true,
    linkify: true,
    highlight: function (str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return '<pre class="hljs"><code>' +
            hljs.highlight(lang, str, true).value +
            '</code></pre>';
        } catch (__) { }
      }

      return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
    }
  })
    .use(require('markdown-it-anchor'))
    .use(require('markdown-it-shortcode-tag'), shortcodes)
    .use(require('markdown-it-footnote'))
    .use(require('markdown-it-container'), 'breakout', {
      validate: function (params) {
        return params.trim().match(/^(info|help|alert)/);
      },
      render: function (tokens, idx) {
        var m = tokens[idx].info.trim().match(/^(info|help|alert) (.+)$/);
        
        if (tokens[idx].nesting === 1) { // opening tag
          var unique = counter();
          return `
            <aside class="gel-breakout-box gel-breakout-box extra-padding" aria-labelledby="aside-${unique}">
              <h4 id="aside-${unique}" aria-hidden="true"><svg class="gel-breakout-box__icon gel-icon gel-icon--text"><use xlink:href="${data.site.basedir}static/images/gel-icons-core-set.svg#gel-icon-${m[1]}" style="fill:#404040;"></use></svg>${m[2]}</h4><div>`;
        } else { // closing tag
          return `
            </aside>
          `;
        }
      }
    });

  eleventyConfig.addPlugin(function (eleventyConfig, pluginNamespace) {
    eleventyConfig.namespace(pluginNamespace, () => {
      eleventyConfig.addFilter('toc', function (content, opts) {
        var $ = cheerio.load(content);
        var result = '<ol id="gel-toc__links" class="gel-toc">';
        $('h2').each(function (i, h2) {
          result += '<li><a href="#' + h2.attribs.id + '">' + $(h2).text() + '</a></li>';
        });
        return result + '</ol>';
      })
    })
  });
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.addPassthroughCopy("src/static/css");
  eleventyConfig.addPassthroughCopy("src/static/css/bbc-grandstand/dist");
  eleventyConfig.addPassthroughCopy("src/static/images");
  eleventyConfig.addPassthroughCopy("src/static/js");

  return {
    htmlTemplateEngine: 'njk',
    passthroughFileCopy: true
  };
};
