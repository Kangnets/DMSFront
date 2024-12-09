let results: { video: string; comments: string[] }[] = []; // 영상 제목과 댓글 저장

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// XPath 요소를 기다리는 함수
const waitForElement = async (
  xpath: string,
  timeout: number = 10000
): Promise<HTMLElement | null> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue as HTMLElement;
    if (element) return element;
    await sleep(500); // 대기
  }
  return null; // 시간 초과 시 null 반환
};

// 댓글 섹션 스크롤
const scrollToLoadComments = async (timeout: number = 10000): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    window.scrollBy(0, window.innerHeight);
    await sleep(1000);
    const commentSection = document.evaluate(
      '//*[@id="content-text"]/span',
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    if (commentSection.snapshotLength > 0) return; // 댓글 섹션 발견 시 종료
  }
  console.warn("Failed to load comments within timeout.");
};

// 영상 제목과 댓글 크롤링
const crawlVideoComments = async (
  videoXPath: string,
  commentXPath: string,
  videoLimit: number,
  commentLimit: number
): Promise<void> => {
  for (let i = 0; i < videoLimit; i++) {
    // i번째 영상 선택
    const videoElement = await waitForElement(
      `(${videoXPath})[${i + 1}]`,
      10000
    );
    if (!videoElement) {
      console.warn(`Video ${i + 1} not found. Skipping.`);
      continue;
    }

    const videoTitle = videoElement.textContent?.trim() || `Video ${i + 1}`;
    console.log(`Processing video: ${videoTitle}`);
    videoElement.click(); // 영상 클릭
    await sleep(5000); // 페이지 이동 대기

    await scrollToLoadComments(); // 댓글 로드 대기

    // 댓글 추출
    const comments = extractComments(commentXPath, commentLimit);
    results.push({ video: videoTitle, comments });

    console.log(`Crawled ${comments.length} comments for: ${videoTitle}`);

    // 이전 페이지로 복귀
    window.history.back();
    await waitForElement(videoXPath); // 이전 페이지가 로드될 때까지 대기
    await sleep(2000); // 추가 안정 대기
  }

  // 크롬 백그라운드로 결과 전송
  chrome.runtime.sendMessage(
    { action: "crawl_results", data: results },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error sending message:",
          chrome.runtime.lastError.message
        );
      } else if (response?.success) {
        console.log("Results successfully sent:", results);
      } else {
        console.error(
          "Failed to send results:",
          response?.error || "Unknown error"
        );
      }
    }
  );
};

// XPath로 댓글 추출
const extractComments = (xpath: string, limit: number): string[] => {
  const elements = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  const comments: string[] = [];
  for (let i = 0; i < Math.min(elements.snapshotLength, limit); i++) {
    const textContent = elements.snapshotItem(i)?.textContent?.trim();
    if (textContent) comments.push(textContent);
  }
  return comments;
};

// 메시지 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "crawl_comments") {
    const { videoLimit, commentLimit } = request;

    crawlVideoComments(
      '//*[@id="video-title"]', // 영상 XPath
      '//*[@id="content-text"]/span', // 댓글 XPath
      videoLimit,
      commentLimit
    )
      .then(() => {
        sendResponse({ success: true, data: results });
      })
      .catch((error) => {
        console.error("Error during crawl:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 비동기 응답 처리
  }
});
