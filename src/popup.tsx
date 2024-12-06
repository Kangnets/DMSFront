import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const Popup = () => {
  const [results, setResults] = useState<string[]>([]);
  const [response, setResponse] = useState<string | null>(null);

  const handleCrawl = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.id) {
        chrome.tabs.sendMessage(
          tab.id,
          { action: "crawl_xpath", xpath: '//*[@id="video-title"]' },
          (response) => {
            if (!response.success) {
              console.error("Crawl failed:", response.error);
            }
          }
        );
      }
    });
  };

  const handleAnalyze = () => {
    if (results.length === 0) {
      alert("No data to analyze. Please crawl data first.");
      return;
    }

    fetch(
      "https://port-0-dmsbackend-m0zjsul0a4243974.sel4.cloudtype.app/sentiment/analysis",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: results }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setResponse(`Error: ${data.error}`);
        } else {
          const {
            total,
            positiveCount,
            negativeCount,
            positiveRatio,
            negativeRatio,
          } = data;
          setResponse(
            `Total: ${total}\nPositive: ${positiveCount} (${positiveRatio})\nNegative: ${negativeCount} (${negativeRatio})`
          );
        }
      })
      .catch((error) => {
        console.error("Error analyzing sentiment:", error);
        setResponse("Failed to analyze sentiment. Check console for details.");
      });
  };

  useEffect(() => {
    // 메시지 수신
    const listener = (message: any) => {
      if (message.action === "crawl_results") {
        setResults(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return (
    <div style={{ padding: "10px", width: "300px" }}>
      <button onClick={handleCrawl} style={{ marginBottom: "10px" }}>
        Start Crawling
      </button>
      <button onClick={handleAnalyze} style={{ marginBottom: "10px" }}>
        Analyze Sentiment
      </button>
      <h3>Crawled Results</h3>
      <ul style={{ maxHeight: "100px", overflowY: "auto" }}>
        {results.length > 0 ? (
          results.map((item, index) => <li key={index}>{item}</li>)
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
