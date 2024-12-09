import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const Popup = () => {
  const [results, setResults] = useState<
    { video: string; comments: string[] }[]
  >([]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 메시지 수신 리스너
  useEffect(() => {
    const listener = (message: any) => {
      if (message.action === "crawl_results") {
        console.log("Crawl results received:", message.data);
        setResults(message.data); // 상태 업데이트
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  // 크롤링 시작
  const handleCrawl = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "crawl_comments", videoLimit: 10, commentLimit: 10 },
          (response) => {
            if (!response.success) {
              setResponse(`Crawl failed: ${response.error}`);
              console.error("Crawl failed:", response.error);
            } else {
              setResponse("Crawl completed successfully!");
            }
          }
        );
      }
    });
  };

  // POST 요청 전송
  const handleAnalyze = async () => {
    if (results.length === 0) {
      setResponse("No crawled data to analyze.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:3000/sentiment/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: results }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const resultData = await res.json();
      setResponse(
        `Analysis successful: ${JSON.stringify(resultData, null, 2)}`
      );
      console.log("Analysis response:", resultData);
    } catch (error: any) {
      setResponse(`Analysis failed: ${error.message}`);
      console.error("Error during analysis:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "10px", width: "300px" }}>
      <button onClick={handleCrawl} style={{ marginBottom: "10px" }}>
        Start Crawling
      </button>

      <button
        onClick={handleAnalyze}
        style={{ marginBottom: "10px" }}
        disabled={isLoading}
      >
        {isLoading ? "Analyzing..." : "Send for Analysis"}
      </button>

      <h3>Crawled Results</h3>
      <ul style={{ maxHeight: "300px", overflowY: "auto" }}>
        {results.length > 0 ? (
          results.map((item, index) => (
            <li key={index}>
              <strong>{item.video}</strong>
              <ul>
                {item.comments.map((comment, cIndex) => (
                  <li key={cIndex}>{comment}</li>
                ))}
              </ul>
            </li>
          ))
        ) : (
          <li>No data yet</li>
        )}
      </ul>

      <h3>Analysis Response</h3>
      <pre>{response || "No response yet"}</pre>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
