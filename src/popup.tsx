import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { ArrowLeft } from "./assets/arrow_left";
import { Search } from "./assets/search";

ChartJS.register(ArcElement, Tooltip, Legend);

const Popup = () => {
  const [results, setResults] = useState<
    { video: string; comments: string[] }[]
  >([]);
  const [response, setResponse] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "loading" | "done">("idle");

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
    setStage("loading");
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
            setStage("idle");
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

    setStage("loading");
    setIsLoading(true);
    try {
      const res = await fetch(
        "https://port-0-dmsbackend-m0zjsul0a4243974.sel4.cloudtype.app/sentiment/analysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: results }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const resultData: {
        percentages: { [key: string]: string };
        sentimentResults: { [key: string]: string };
      } = await res.json();

      const percentages = resultData.percentages;

      // Prepare chart data
      setChartData({
        labels: Object.keys(percentages),
        datasets: [
          {
            data: Object.values(percentages).map((v) => parseFloat(v)),
            backgroundColor: ["#4CAF50", "#FF5722"],
            hoverBackgroundColor: ["#66BB6A", "#FF7043"],
          },
        ],
      });

      setResponse(
        `Analysis successful: ${JSON.stringify(resultData, null, 2)}`
      );
      console.log("Analysis response:", resultData);
    } catch (error: any) {
      setResponse(`Analysis failed: ${error.message}`);
      console.error("Error during analysis:", error);
    } finally {
      setIsLoading(false);
      setStage("done");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        width: "329px",
        height: "auto",
        flexDirection: "column",
        alignItems: "center",
        flexShrink: 0,
        borderRadius: "10px",
        background: "#FFF",
        boxShadow: "4px 4px 4px 0px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "329px",
          height: "42px",
          flexShrink: 0,
          color: "#FFF",
          fontFamily: '"Partial Sans KR"',
          fontSize: "16px",
          fontStyle: "normal",
          fontWeight: 400,
          lineHeight: "normal",
          borderRadius: "10px 10px 0px 0px",
          background:
            "var(--main2, linear-gradient(90deg, #575fca 0%, #6c76f7 100%))",
        }}
      >
        <div style={{ marginTop: "10px" }}>BubbleBubble</div>
      </div>

      {stage === "idle" && (
        <>
          <div>
            <Search />
          </div>

          <button
            onClick={handleCrawl}
            style={{
              display: "flex",
              width: "273px",
              height: "46px",
              padding: "12px 34px",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              borderRadius: "10px",
              background: "#f2f2f2",
              color: "#6972ef",
              fontFamily: '"Pretendard Variable"',
              fontSize: "20px",
              fontStyle: "normal",
              fontWeight: 800,
              lineHeight: "normal",
              border: 0,
            }}
          >
            알고리즘 정보 수집하기
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isLoading}
            style={{
              display: "flex",
              width: "273px",
              height: "46px",
              padding: "12px 34px",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              borderRadius: "10px",
              background: "#f2f2f2",
              color: "#6972ef",
              fontFamily: '"Pretendard Variable"',
              fontSize: "20px",
              fontStyle: "normal",
              fontWeight: 800,
              lineHeight: "normal",
              border: 0,
              marginTop: "15px",
            }}
          >
            {isLoading ? "Analyzing..." : "내 알고리즘 진단하기"}
          </button>
        </>
      )}

      {stage === "loading" && (
        <div
          style={{
            color: "#6972ef",
            fontFamily: '"Pretendard Variable"',
            fontSize: "20px",
            fontStyle: "normal",
            fontWeight: 800,
            lineHeight: "normal",
          }}
        >
          로딩중
        </div>
      )}

      {stage === "done" && chartData && (
        <>
          <Doughnut data={chartData} />
          <button
            style={{
              display: "flex",
              width: "273px",
              height: "46px",
              padding: "12px 34px",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              borderRadius: "10px",
              background: "#f2f2f2",
              color: "#6972ef",
              fontFamily: '"Pretendard Variable"',
              fontSize: "20px",
              fontStyle: "normal",
              fontWeight: 800,
              lineHeight: "normal",
              border: 0,
              marginTop: "15px",
            }}
            onClick={() => setStage("idle")}
          >
            내 알고리즘 개선하기
          </button>
        </>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
