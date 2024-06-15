#!/usr/bin/env bash

./node_modules/.bin/grpc_tools_node_protoc \
	--plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
	--ts_proto_out=./src/proto \
	--ts_proto_opt=outputServices=nice-grpc,outputServices=generic-definitions,useExactTypes=false,importSuffix=.js,esModuleInterop=true \
	--proto_path=. \
	./dapr/proto/runtime/v1/dapr.proto
