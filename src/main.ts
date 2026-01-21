import './style.css';

function init() {
  console.log('Userscript loaded: Better Habr');

  const container = document.createElement('div');
  container.id = 'my-userscript-container';
  container.innerHTML = `
    <div>Hello from <b>Better Habr</b>!</div>
    <button id="my-btn">Click me</button>
  `;

  document.body.appendChild(container);

  const btn = container.querySelector('#my-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      alert('Button clicked inside Userscript!');
    });
  }
}

init();
