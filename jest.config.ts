import type { Config } from "jest";

const config: Config = {
  // 1. Usar ts-jest como motor
  preset: "ts-jest",

  // 2. Entorno de Node
  testEnvironment: "node",

  // 3. Recolectar cobertura
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",

  // 4. Ignorar carpetas problemáticas (ajustado para Windows/Linux)
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.serverless/",
    "/.serverless/build/",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.serverless/", "<rootDir>/dist/"],

  // 5. Soporte para tus ALIAS (@shared)
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
  },

  // 6. Configuración de transformación
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        // Como tu proyecto es CommonJS para la Lambda, forzamos esto aquí también
        useESM: false,
      },
    ],
  },
};

export default config;
