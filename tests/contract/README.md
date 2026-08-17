# Contract tests

These run the real `claude` binary. They cost money and take minutes, so
`npm test` leaves them out. Run them before a release:

    npm run test:contract

They pin the CLI behaviour Zetrem is built on. When one fails, the CLI
changed under us and the app is quietly wrong until it is followed.
