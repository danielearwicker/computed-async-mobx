const fs = require("fs");
const path = require("path");

const versions = {
    "6": {
        "mobx": "6.0.4",
        "mobx-react": "7.0.5",
        "mobx-utils": "6.0.3",
    },
    "5": {
        "mobx": "5.13.0",
        "mobx-react": "6.1.3",
        "mobx-utils": "5.4.1",
    },
    "4": {
        "mobx": "4.15.0",
        "mobx-react": "6.1.4",
        "mobx-utils": "5.5.5",
    }
}

const version = versions[process.argv[2]];
if (!version) {
    console.error(`Specify a supported version: ${Object.keys(versions).join()}`);
    process.exit(-1);
}

const packages = fs.readdirSync("packages").filter(x => x[0] !== ".");

for (const name of packages) {
    const filePath = path.join("packages", name, "package.json");
    const package = JSON.parse(fs.readFileSync(filePath, "utf8"));

    package.devDependencies = { ...package.devDependencies, ...version };

    fs.writeFileSync(filePath, JSON.stringify(package, null, 4));
}
