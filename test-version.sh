. ./clean-packages.sh
node version-switcher.js $1
yarn
pushd packages/computed-async-mobx
yarn test
popd
