let results: { video: string; comments: string[] }[] = [];

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
    await sleep(500);
  }
  return null;
};

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
    if (commentSection.snapshotLength > 0) return;
  }
  console.warn("Failed to load comments within timeout.");
};

const crawlVideoComments = async (
  videoXPath: string,
  commentXPath: string,
  videoLimit: number,
  commentLimit: number
): Promise<void> => {
  for (let i = 0; i < videoLimit; i++) {
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
    videoElement.click();
    await sleep(5000);

    await scrollToLoadComments();

    const comments = extractComments(commentXPath, commentLimit);
    results.push({ video: videoTitle, comments });

    console.log(`Crawled ${comments.length} comments for: ${videoTitle}`);

    window.history.back();
    await waitForElement(videoXPath);
    await sleep(2000);
  }

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "crawl_comments") {
    const { videoLimit, commentLimit } = request;

    crawlVideoComments(
      '//*[@id="video-title"]',
      '//*[@id="content-text"]/span',
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

    return true;
  }
});
