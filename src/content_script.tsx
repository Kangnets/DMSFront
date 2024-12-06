let results: string[] = []; // 결과 값을 저장할 배열

const scrollAndExtract = async (
  xpath: string,
  limit: number = 100
): Promise<string[]> => {
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const extract = (xpath: string): string[] => {
    const elements = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    const items: string[] = [];
    for (let i = 0; i < elements.snapshotLength; i++) {
      const textContent = elements.snapshotItem(i)?.textContent?.trim();
      if (textContent) items.push(textContent);
    }
    return items;
  };

  while (results.length < limit) {
    results.push(...extract(xpath));
    results = [...new Set(results)]; // 중복 제거

    if (results.length >= limit) break;

    window.scrollBy(0, window.innerHeight); // 페이지 아래로 스크롤
    await sleep(1000); // 스크롤 후 대기
  }

  return results.slice(0, limit); // 최대 100개로 제한하여 반환
};

// 메시지 리스너 설정
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "crawl_xpath") {
    scrollAndExtract(request.xpath)
      .then((data) => {
        chrome.runtime.sendMessage({ action: "crawl_results", data });
        sendResponse({ success: true });
      })
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
