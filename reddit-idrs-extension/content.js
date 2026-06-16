// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyzeComments") {
    analyzeRedditComments().then(results => {
      sendResponse({results: results});
    });
    return true; // 保持消息通道开启，等待异步响应
  }
});

async function analyzeRedditComments() {
  // 1. 获取页面上所有评论元素 (根据Reddit的DOM结构调整选择器)
  const commentElements = document.querySelectorAll('[data-testid="comment"]');
  const comments = [];
  commentElements.forEach(el => {
    // 尝试获取评论的文本内容，排除作者等信息，这里需要根据实际DOM调整
    const textElement = el.querySelector('[data-testid="comment-body"]');
    if (textElement) {
      comments.push(textElement.innerText);
    }
  });

  // 2. 如果没有评论，直接返回
  if (comments.length === 0) {
    return [];
  }

  // 3. 调用本地 API 进行分析
  const results = [];
  for (const comment of comments) {
    try {
      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: comment }),
      });
      const data = await response.json();
      results.push({
        text: comment,
        probabilities: data.probabilities,
        labels: data.labels,
      });
    } catch (error) {
      console.error('分析评论失败:', error);
      results.push({
        text: comment,
        error: '分析失败',
      });
    }
  }

  // 4. (可选) 在页面上显示结果
  displayResultsOnPage(results);

  return results;
}

function displayResultsOnPage(results) {
  // 这里实现将结果显示在Reddit评论旁边的逻辑
  // 例如，可以在每条评论后面添加一个彩色标签
  // 注意：Reddit的DOM结构可能变化，需要稳健的选择器
  const commentElements = document.querySelectorAll('[data-testid="comment"]');
  commentElements.forEach((el, index) => {
    if (index >= results.length) return;
    const result = results[index];
    if (result.error || result.labels.length === 0) return;

    // 创建标签容器
    const labelContainer = document.createElement('div');
    labelContainer.style.marginTop = '5px';
    labelContainer.style.fontSize = '12px';

    result.labels.forEach(label => {
      const tag = document.createElement('span');
      tag.textContent = label;
      tag.style.display = 'inline-block';
      tag.style.marginRight = '5px';
      tag.style.padding = '2px 6px';
      tag.style.borderRadius = '3px';
      tag.style.backgroundColor = '#ff7f50';
      tag.style.color = 'white';
      labelContainer.appendChild(tag);
    });

    // 将标签添加到评论元素中
    el.appendChild(labelContainer);
  });
}
