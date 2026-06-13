const themeToggleButton = document.querySelector('#theme-toggle');
const storageKey = 'codex-theme';

const applyTheme = (theme) => {
  document.body.classList.toggle('light', theme === 'light');
  themeToggleButton.textContent = theme === 'light' ? 'Use dark mode' : 'Use light mode';
};

const storedTheme = window.localStorage.getItem(storageKey);
const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = storedTheme ?? (preferredDark ? 'dark' : 'light');

applyTheme(initialTheme);

themeToggleButton.addEventListener('click', () => {
  const nextTheme = document.body.classList.contains('light') ? 'dark' : 'light';
  window.localStorage.setItem(storageKey, nextTheme);
  applyTheme(nextTheme);
});
