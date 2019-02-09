let list404 = [], list200 = [], results = [];
let input404 = document.querySelector(`#input404`);
let input200 = document.querySelector(`#input200`);
let preloader = document.querySelector(`#preloader`);
let scoreLimit = document.querySelector(`#scoreLimit`);
let status = document.querySelector(`#status`);
let output = document.querySelector(`#output`);

const excludes = ['/index.php', '/index.html', '/index.htm'];

const options = {
  wildcards: "",
  collapseWhitespace: true,
  force_ascii: true,
  full_process: true,
};

const Preloader = {
  init: () => { preloader.style.display = "block"; status.innerHTML = `Searching ...` },
  start: () => { preloader.style.display = "flex"; status.innerHTML = `Parsing ...` },
  stop: () => { preloader.style.display = "none"; status.innerHTML = `` },
};

const saveToFile = (filename, type, data) => {
  const blob = new Blob([data], {type: type});
  const element = document.createElement('a');
  element.href = window.URL.createObjectURL(blob);
  element.download = filename;
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  console.log(`Saved to file ${filename}`);
};

const getPath = (url) => {
  let link = document.createElement(`a`);
  link.href = url;
  return decodeURIComponent(link.pathname);
};

const filterList = (list) => Array.from(new Set(list.toLowerCase().split(`\n`).filter(entry => /\S/.test(entry)).map(url => getPath(url)).filter(Boolean).filter(url => !excludes.includes(url))));

const set200List = (list) => {
  console.time(`set200List`);
  list200 = filterList(list);
  console.timeEnd(`set200List`);
};

const set404List = (list) => {
  console.time(`set404List`);
  list404 = filterList(list).filter(url => !list200.includes(url));
  console.timeEnd(`set404List`);
};

const init = () => {
  Preloader.init();
  fetch('/search', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({list404, list200, options})
  }).then(res => res.json()).then(data => {
    console.time(`search`);
    Object.entries(data).forEach(result => results.push({ url404: result[0], url200: result[1][0].choice, score: result[1][0].score }) );
    sortScore();
    console.timeEnd(`search`);
    genScore();
    Preloader.stop();
  }).catch(err => console.log(err));
};

const getCellValue = (tr, idx) => tr.children[idx].innerText || tr.children[idx].textContent;

const comparer = (idx, asc) => (a, b) => ((v1, v2) =>
    v1 !== '' && v2 !== '' && !isNaN(v1) && !isNaN(v2) ? v2 - v1 : v1.toString().localeCompare(v2)
    )(getCellValue(asc ? a : b, idx), getCellValue(asc ? b : a, idx));

const makeSortable = () => {
  document.querySelectorAll('th').forEach(th => th.addEventListener('click', (() => {
    const table = th.closest('table');
    Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
        .sort(comparer(Array.from(th.parentNode.children).indexOf(th), this.asc = !this.asc))
        .forEach(tr => table.appendChild(tr));
})))};

const makeEditable = () => {
  const bloodhoundList200 = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.nonword,
    queryTokenizer: Bloodhound.tokenizers.nonword,
    local: list200,
  });

  $('.editable textarea').typeahead({
    hint: true,
    highlight: true,
    minLength: 1,
  },
  {
    name: 'list200',
    limit: 10,
    source: bloodhoundList200,
  }).on('typeahead:selected', function (e, item) {
    const index = e.target.id;
    if(results[index].url200 != item) {
      results[index].url200 = getPath(item);
      results[index].score = 999;
      e.target.parentNode.parentNode.parentNode.cells[2].innerHTML = `<span class="badge badge-pill badge-danger"> edycja </span>`;
    }
    $('.editable textarea').blur();
  }).on('keyup', this, function (e) {
    const index = e.target.id;
    results[index].url200 = getPath(e.target.value);
    results[index].score = 999;
    e.target.parentNode.parentNode.parentNode.cells[2].innerHTML = `<span class="badge badge-pill badge-danger"> edycja </span>`;
  }).on('keydown', this, function (e) {
    if(e.keyCode == 13) {
      $('.editable textarea').blur();
      e.preventDefault();
      return false;
    }
  });
};

const sortScore = () => results.sort((a, b) => a.score - b.score);

const limitScore = (matched, score) => (score > scoreLimit.value) ? matched : `/`;

const deleteScore = (btn, index) => {
  let row = btn.parentNode.parentNode;
  row.parentNode.removeChild(row);
  delete results[index];
};

const genScore = () => {
  console.time(`genScore`);
  output.innerHTML = `<table class="table table-bordered table-condensed">
  <tr>
  <th class="col-lg-auto">Lp.</i></th>
  <th class="col-lg-5"> HTTP 404 urls <i class="fas fa-sort"></i></th>
  <th class="col-lg-auto">Wynik</th>
  <th class="col-lg-5"> HTTP 200 urls <i class="fas fa-sort"></i></th>
  <th class="col-lg-auto"><input type="checkbox"></th>
  <th class="col-lg-auto">&nbsp;</th>
  </tr>
  ${results.filter(Boolean).map((result, index) =>
   `<tr>
      <td class="align-middle">${index+1}</td>
      <td class="align-middle">${result.url404}</td>
      <td class="align-middle">${(result.score > 100) ? `<span class="badge badge-pill badge-danger"> edycja </span>` : `<span class="badge badge-pill badge-success"> ${result.score} </span>`}</td>
      <td class="align-middle editable"><textarea id="${index}">${limitScore(result.url200, result.score)}</textarea></td>
      <td class="align-middle"><input type="checkbox"></td>
      <td class="align-middle"><div class="btn btn-danger btn-sm" onClick="deleteScore(this, ${index});"><i class="fas fa-trash-alt"></i></div></td>
    </tr>`).join('')}</table>`;
  makeSortable();
  makeEditable();
  console.timeEnd(`genScore`);
};

const cleanRegex = (url) => getPath(url).replace(/^\//, ``).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s/g, `\\s`);

const Schema = {
  joomlaMod: (url, matched) => url + `|` + matched,
  rewriteRule: (url, matched) => `RewriteRule ^${cleanRegex(url)}$ ${matched} [R=301,NC,L]`,
  rewriteCond: (url, matched) => `RewriteCond %{REQUEST_URI} ^\\\/${cleanRegex(url)}$<br>RewriteRule ^(.*)$ ${matched} [R=301,NC,L]`,
  phpRequestUri: (url, matched, key) => `${key ? "else" : ""}if($_SERVER['REQUEST_URI']=='${url}') {<br>header("HTTP/1.1 301 Moved Permanently");<br>header("Location: ${matched}");<br>header("Connection: close");<br>exit;<br>}`,
};

const genSchema = (getSchema, html = true) => {
  let generated = ``;
  console.time(`genSchema`);
  results.map((result, key) => { generated += `<p>${getSchema(result.url404, limitScore(result.url200, result.score), key)}</p>`; });
  console.timeEnd(`genSchema`);
  if(html) {
    output.innerHTML = generated;
  } else {
    return generated.replace(/<p>/g, ``).replace(/(<br>|<\/p>)/g, `\n`);
  }
};

const copySchema = (getSchema) => {
  const element = document.createElement('textarea');
  element.value = genSchema(getSchema, false);
  element.setAttribute('readonly', '');
  element.style.position = 'absolute';
  element.style.left = '-9999px';
  document.body.appendChild(element);
  element.select();
  document.execCommand('copy');
  document.body.removeChild(element);
  console.log(`Copied to Clipboard`);
};

const saveSchema = (getSchema) => {
  saveToFile(`${getSchema.name}.txt`, `text/plain;charset=utf-8`, genSchema(getSchema, false));
};

const saveConf = () => {
  const fileName = prompt("Enter a name for the configuration file", "domain");
  if(fileName) {
    saveToFile(`${fileName}.rewriter`, `application/json;charset=utf-8`, JSON.stringify({list200, list404, results}));
  }
};

const loadConf = (input) => {
  if(window.confirm("You will delete all current content. Cancel or confirm OK")) {
    const reader = new FileReader();
    reader.onload = () => {const conf = JSON.parse(reader.result); ({list200, list404, results} = conf); genScore()};
    reader.readAsText(input.target.files[0],"UTF-8");
  }
};

document.querySelector(`form`).addEventListener('submit', (e) => {genScore(); e.preventDefault();}, false);
