import path from "path";
import fs from "fs-extra";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Api, StackContext } from "@serverless-stack/resources";

export function MyStack({ stack, app }: StackContext) {
  if (!app.local) {
    // Create a layer for production
    // This saves shipping Prisma binaries once per function
    const layerPath = ".sst/layers/prisma";

    // Clear out the layer path
    fs.removeSync(layerPath, { force: true, recursive: true });
    fs.mkdirSync(layerPath, { recursive: true });

    // Copy files to the layer
    const toCopy = [
      "node_modules/.prisma",
      "node_modules/@prisma/client",
      "node_modules/prisma/build",
    ];
    for (const file of toCopy) {
      fs.copySync(file, path.join(layerPath, "nodejs", file), {
        // Do not include binary files that aren't for AWS to save space
        filter: (src) => !src.endsWith("so.node") || src.includes("rhel"),
      });
    }
    const prismaLayer = new lambda.LayerVersion(stack, "PrismaLayer", {
      code: lambda.Code.fromAsset(path.resolve(layerPath)),
    });

    // Add to all functions in this stack
    stack.addDefaultFunctionLayers([prismaLayer]);
  }

  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        environment: {
          DATABASE_URL: app.local
            ? "mysql://etqust46yh38:pscale_pw_Dx-OAS93vzuNbheNn4d9puQSHBfdHt5xEQT4Lib9tTE@shze01dtay9i.eu-central-1.psdb.cloud/prisma-serverless?sslaccept=strict"
	    : "mysql://ugmqh8vtx3zl:pscale_pw_ncon39eGR6hvo1IJPQAemc3XJ1AwImRTtRG-i-TSV4s@eno3xjfj9s5q.eu-central-1.psdb.cloud/prisma-serverless?sslaccept=strict"
        },
        bundle: {
          // Only reference external modules when deployed
          externalModules: app.local ? [] : ["@prisma/client", ".prisma"],
        },
      },
    },
    routes: {
      "GET /post": "functions/index.handler",
    },
  });

  stack.addOutputs({
    api: api.url,
  });
}
