const input = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

// Load tasks from localStorage
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// Function to render tasks
function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.textContent = task;

    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.className = 'complete-btn';

    btn.addEventListener('click', () => {
      li.classList.add('completed');
      setTimeout(() => {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
      }, 400);
    });

    li.appendChild(btn);
    taskList.appendChild(li);
  });
}

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

input.addEventListener('input', () => {
  addBtn.disabled = !input.value.trim();
});

addBtn.addEventListener('click', () => {
  if (!input.value.trim()) return;
  tasks.push(input.value.trim());
  saveTasks();
  renderTasks();
  input.value = '';
  addBtn.disabled = true;
});

// Initial render on page load
window.addEventListener('load', () => {
  renderTasks();
});


window.addEventListener('load', () => {
  setTimeout(() => {
    document.body.classList.add('loaded');
    document.getElementById('main-content').setAttribute('aria-hidden', 'false');
    document.getElementById('loading-overlay').setAttribute('aria-hidden', 'true');
  }, 600);
});




