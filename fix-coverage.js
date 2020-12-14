var fs = require("fs"),
    prefix = "var __decorate =",
    paths = [
        "built/src/promisedComputed.js",
    ];

paths.forEach(path => {

    // tell istanbul to ignore TS-generated decorator code
    var src = fs.readFileSync(path, "utf8");
    src = src.replace(prefix, "/* istanbul ignore next */\n" + prefix);
    fs.writeFileSync(path, src);
});
