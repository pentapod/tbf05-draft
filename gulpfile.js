const gulp = require('gulp');
const gulpLoadPlugins = require('gulp-load-plugins');
const marked = require('marked');
const Prism = require('node-prismjs');
const pug = require('pug');
const del = require('del');
const browserSync = require('browser-sync');
const GithubSlugger = require('github-slugger');

const dakuonMap = [
  ['が','ぎ','ぐ','げ','ご','ざ','じ','ず','ぜ','ぞ','だ','ぢ','づ','で','ど','ば','び','ぶ','べ','ぼ','ぱ','ぴ','ぷ','ぺ','ぽ'],
  ['か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と','は','ひ','ふ','へ','ほ','は','ひ','ふ','へ','ほ'],
];

marked.setOptions({
  highlight: function(code, lang, cb) {
    const highlighted = (Prism.languages[lang])
      ? Prism.highlight(code, Prism.languages[lang])
      : code;
    return highlighted;
  }
});

pug.filters.code = function(str, options, locals) {
  const opts = Object.assign({}, options || {}, locals || {});
  const lang = opts.lang || 'plain';
  const start = (typeof opts.start === 'number')? opts.start : null;

  const highlighted = (Prism.languages[opts.lang])
    ? Prism.highlight(str, Prism.languages[opts.lang])
    : str;

  const lineNumberGutter = (start !== null)
    ?   `<span class="line-numbers-rows" style="counter-reset: linenumber ${start - 1}">`
      + Array(str.split('\n').length).join('<span></span>')
      + `</span>`
    : '';

  return `<pre class="${(start !== null)? 'line-numbers' : ''}" ${(start !== null)? 'data-start="'+start+'"' : ''}>`
       +   `<code class="language-${lang}">${lineNumberGutter}${highlighted}</code>`
       + `</pre>`;
}

pug.filters.marked = (str, options) => {
  return marked(str, options);
}

const keywordDict = {};
const slugger = new GithubSlugger();
const slugPrefix = 'kwd_';
pug.filters['define-keyword'] = (str, options) => {
  const keywordList = str.split(/\n/)
    .map(s => s.trim())
    .filter(s => s !== '');
  const tags = [];

  for (let kw of keywordList) {
    const slug = `${slugPrefix}${slugger.slug(kw)}`;
    if (kw in keywordDict) {
      keywordDict[kw].push(slug);
    } else {
      keywordDict[kw] = [slug];
    }
    tags.push(`<div class="index-keyword" id="${slug}"></div>`);
  }
  return tags.join('\n') + '\n';
}

pug.filters['render-index'] = (str, options) => {
  const keywords = Object.keys(keywordDict).sort();
  let firstLetter = null;
  let output = '';

  const pickFirstLetter = (str) => {
    const c = str.charAt(0).toUpperCase();
    const i = dakuonMap[0].indexOf(c);
    return i >= 0? dakuonMap[1][i] : c;
  }

  keywords.forEach(k => {
    if (pickFirstLetter(k) !== firstLetter) {
      firstLetter = pickFirstLetter(k);
      output += `<div class="first-letter">${firstLetter}</div>\n`;
    }
    // keywords are deined with a furigana
    // ex: なまえ|名前
    const keyName = k.indexOf('|') >= 0 ? k.substr(k.indexOf('|') + 1) : k;
    const keyLink = keywordDict[k]
      .map(slug => `<a href="#${slug}"></a>`)
      .join(', ');
    output += `<li class="index-item">\n`
            + `  <div class="index-keyword-name">${keyName}</div>\n`
            + `  <div class="index-keyword-links">${keyLink}</div>\n`
            + `</li>\n`;
  });
  return output;
}

const $ = gulpLoadPlugins();
const plumberOpt = {
  errorHandler: function(err) {
    console.error(err.stack);
    this.emit('end');
  },
}

gulp.task('default', ['pug', 'assets', 'stylus']);

gulp.task('pug', () => {
  gulp.src('content/hyoshi.pug')
    .pipe($.plumber(plumberOpt))
    .pipe($.pug({
      pug: pug,
      pretty: true,
    }))
    .pipe(gulp.dest('dest/'));

  gulp.src('content/index.pug')
    .pipe($.plumber(plumberOpt))
    .pipe($.pug({
      pug: pug,
      pretty: true,
    }))
    .pipe(gulp.dest('dest/'));
});

gulp.task('assets', ['assets:delete'], () =>
  gulp.src('content/assets/**/*')
    .pipe(gulp.dest('dest/assets/'))
);

gulp.task('assets:delete',
  del.bind(null, ['dest/assets/**/*'])
);

gulp.task('stylus', () => {
  gulp.src('style/hyoshi.styl')
    .pipe($.plumber(plumberOpt))
    .pipe($.stylus({
      'include css': true,
    }))
    .pipe(gulp.dest('dest/'));

  gulp.src('style/main.styl')
    .pipe($.plumber(plumberOpt))
    .pipe($.sourcemaps.init())
    .pipe($.stylus({
      'include css': true,
    }))
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('dest/'))
    .pipe(browserSync.reload({
      stream: true,
    }));
});

gulp.task('browsersync', () => {
  browserSync({
    server: {
      baseDir: 'dest/',
      index: 'index.html',
    },
  });
});

gulp.task('bs-reload', () => {
  browserSync.reload();
})

gulp.task('watch', ['default', 'browsersync'], () => {
  gulp.watch('content/**/*.pug', ['pug']);
  gulp.watch('content/assets/**/*', ['assets']);
  gulp.watch('style/**/*.styl', ['stylus']);
  gulp.watch('dest/*.html', ['bs-reload']);
});

gulp.task('watch:stylus', ['stylus'], () => {
  gulp.watch('style/**/*.styl', ['stylus']);
});
