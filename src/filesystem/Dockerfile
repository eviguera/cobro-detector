FROM node:22-alpine

RUN npm install -g @modelcontextprotocol/server-filesystem

WORKDIR /workspace

ENTRYPOINT ["npx", "-y", "@modelcontextprotocol/server-filesystem"]
CMD ["/workspace"]
