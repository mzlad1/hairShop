// JavaScript Detection and Debugging Script
window.addEventListener("load", function () {
  console.log("Page fully loaded");

  // Check if React root element exists
  var rootElement = document.getElementById("root");
  if (rootElement) {
    console.log(
      "Root element found:",
      rootElement.innerHTML.length > 0 ? "Has content" : "Empty"
    );
  }

  // Check if React has rendered anything
  setTimeout(function () {
    var rootElement = document.getElementById("root");
    if (rootElement && rootElement.innerHTML.trim() === "") {
      console.error("React app may not have loaded properly");

      // Show debugging info
      var debugInfo = document.createElement("div");
      debugInfo.innerHTML =
        '<div style="' +
        "position: fixed;" +
        "top: 10px;" +
        "right: 10px;" +
        "background: rgba(220, 53, 69, 0.9);" +
        "color: white;" +
        "padding: 10px;" +
        "border-radius: 5px;" +
        "font-family: monospace;" +
        "font-size: 12px;" +
        "z-index: 10000;" +
        "max-width: 300px;" +
        '">' +
        "<strong>Debug Info:</strong><br>" +
        "User Agent: " +
        navigator.userAgent +
        "<br>" +
        "JavaScript: Enabled<br>" +
        "LocalStorage: " +
        (typeof Storage !== "undefined" ? "Available" : "Not Available") +
        "<br>" +
        "Root Empty: Yes<br>" +
        "Time: " +
        new Date().toLocaleTimeString() +
        "</div>";
      document.body.appendChild(debugInfo);

      // If ES modules not supported, show specific message
      var compatibilityIssues = checkBrowserSupport();
      if (compatibilityIssues.indexOf("ES Modules not supported") !== -1) {
        var moduleWarning = document.createElement("div");
        moduleWarning.innerHTML =
          '<div style="' +
          "position: fixed;" +
          "top: 50%;" +
          "left: 50%;" +
          "transform: translate(-50%, -50%);" +
          "background: rgba(220, 53, 69, 0.95);" +
          "color: white;" +
          "padding: 20px;" +
          "border-radius: 10px;" +
          "font-family: Arial, sans-serif;" +
          "text-align: center;" +
          "z-index: 10001;" +
          "max-width: 400px;" +
          '">' +
          "<h3>متصفح غير متوافق - Browser Not Compatible</h3>" +
          "<p>متصفحك لا يدعم الميزات المطلوبة لهذا الموقع</p>" +
          "<p>Your browser doesn't support required features for this website</p>" +
          "<p><strong>الحلول المقترحة - Suggested Solutions:</strong></p>" +
          '<ul style="text-align: right; font-size: 12px;">' +
          "<li>تحديث المتصفح - Update your browser</li>" +
          "<li>استخدم Chrome أو Firefox - Use Chrome or Firefox</li>" +
          "<li>فعّل JavaScript - Enable JavaScript</li>" +
          "</ul>" +
          '<button onclick="location.reload()" style="' +
          "padding: 10px 20px;" +
          "background: white;" +
          "color: #dc3545;" +
          "border: none;" +
          "border-radius: 5px;" +
          "cursor: pointer;" +
          "margin-top: 10px;" +
          '">إعادة المحاولة - Try Again</button>' +
          "</div>";
        document.body.appendChild(moduleWarning);
      }
    }
  }, 3000);
});

// Browser compatibility check - using ES5 syntax
function checkBrowserSupport() {
  var issues = [];

  // Check ES6 support
  try {
    new Function("() => {}")();
  } catch (e) {
    issues.push("Arrow functions not supported");
  }

  // Check Promise support
  if (typeof Promise === "undefined") {
    issues.push("Promises not supported");
  }

  // Check fetch support
  if (typeof fetch === "undefined") {
    issues.push("Fetch API not supported");
  }

  // Check modules support - more reliable detection
  var testScript = document.createElement("script");
  testScript.type = "module";
  testScript.textContent = "window.esModulesSupported = true;";
  document.head.appendChild(testScript);

  setTimeout(function () {
    if (!window.esModulesSupported) {
      issues.push("ES Modules not supported");
    }
    document.head.removeChild(testScript);
  }, 100);

  if (!("import" in document.createElement("script"))) {
    issues.push("ES Modules not supported");
  }

  if (issues.length > 0) {
    console.warn("Browser compatibility issues:", issues);
  }

  return issues;
}

checkBrowserSupport();
