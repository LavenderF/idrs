document.getElementById('analyzeBtn').addEventListener('click', () => {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = '正在获取评论并分析...';

  // 向当前标签页的 content script 发送消息
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "analyzeComments"}, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = '错误: ' + chrome.runtime.lastError.message;
        return;
      }
      statusDiv.textContent = `分析完成！检测到 ${response.results.length} 条评论。`;
    });
  });
});
