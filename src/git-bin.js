const os = require("node:os");

module.exports = os.platform() === "win32" ? "git.exe" : "git";
