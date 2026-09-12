if (process.env.EXPO_PUBLIC_APP_ENV === 'production') require('./release-gate.cjs');
else console.log('SQLD Pass internal build: production release evidence is not required, draft-content notice remains enabled.');
