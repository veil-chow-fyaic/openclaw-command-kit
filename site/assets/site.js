const commandResponses = {
  '/sessions': {
    title: '/sessions response',
    body: `可恢复的历史对话

当前：周威 · 刚刚

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

发送 /resume 2 切换到第 2 个历史对话。`,
    state: 'verified',
  },
  '/sessions <query>': {
    title: '/sessions testing-b response',
    body: `可恢复的历史对话

当前：周威 · 刚刚

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

查询只过滤当前 actor + route 的已授权结果。
发送 /resume 2 切换到第 2 个历史对话。`,
    state: 'verified',
  },
  '/resume': {
    title: '/resume response',
    body: `可恢复的历史对话

当前：周威 · 刚刚

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

2. B端切换验收 testing-b
   收到，测试正常 · 5月21日 19:31

发送 /resume 2 切换到第 2 个历史对话。`,
    state: 'verified',
  },
  '/resume <query>': {
    title: '/resume 腾讯文档 response',
    body: `可恢复的历史对话

1. 腾讯文档发布不了
   gog 的 OAuth token 过期了... · 5月23日 09:36

/resume <query> 是只读候选列表。
不会因为只有一个匹配项而自动切换。`,
    state: 'verified',
  },
  '/resume N': {
    title: '/resume 2 response',
    body: `已切换到历史对话

对话：B端切换验收 testing-b
时间：5月21日 19:31

最近聊到了：
你：testing-b 这个分支测试怎么样
OpenClaw：收到，测试正常

后续消息将进入这个上下文。`,
    state: 'verified',
  },
};

const commandButtons = document.querySelectorAll('[data-command]');
const output = document.querySelector('#command-output');
const title = document.querySelector('#transcript-title');
const statusDot = document.querySelector('.status-dot');
const routeScene = document.querySelector('.route-scene');

function setCommand(command) {
  const response = commandResponses[command];
  if (!response || !output || !title) {
    return;
  }

  commandButtons.forEach((button) => {
    const isActive = button.dataset.command === command;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  title.textContent = response.title;
  output.textContent = response.body;
  statusDot?.classList.toggle('verified', response.state === 'verified');
  routeScene?.setAttribute('data-active-command', command);
}

commandButtons.forEach((button) => {
  const command = button.dataset.command;
  button.addEventListener('click', () => setCommand(command));
  button.addEventListener('mouseenter', () => setCommand(command));
  button.addEventListener('focus', () => setCommand(command));
});

const scopeControls = document.querySelectorAll('[data-scope-control]');
const scopeBoard = document.querySelector('.scope-board');

function setScope(scope) {
  scopeBoard?.setAttribute('data-scope', scope);
  scopeControls.forEach((control) => {
    const isActive = control.dataset.scopeControl === scope;
    control.classList.toggle('is-active', isActive);
    control.setAttribute('aria-pressed', String(isActive));
  });
}

scopeControls.forEach((control) => {
  const scope = control.dataset.scopeControl;
  control.addEventListener('click', () => setScope(scope));
  control.addEventListener('mouseenter', () => setScope(scope));
  control.addEventListener('focus', () => setScope(scope));
});

const mismatchToggle = document.querySelector('#mismatch-toggle');
const restorePath = document.querySelector('#restore-path');
const restoreState = document.querySelector('#restore-state');

mismatchToggle?.addEventListener('click', () => {
  const nextMode = restorePath?.dataset.mode === 'mismatch' ? 'verified' : 'mismatch';
  restorePath.dataset.mode = nextMode;
  mismatchToggle.setAttribute('aria-pressed', String(nextMode === 'mismatch'));
  restoreState.textContent =
    nextMode === 'mismatch'
      ? 'Blocked: selected generation does not belong to the current route.'
      : 'Verified: selected generation is restored after read-back.';
});

const installSteps = document.querySelectorAll('[data-install-step]');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    { threshold: 0.55 },
  );

  installSteps.forEach((step) => observer.observe(step));
} else {
  installSteps.forEach((step) => step.classList.add('is-visible'));
}
