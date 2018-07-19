FROM node:10.6.0-alpine

RUN mkdir -p /robohydra

COPY feature/ /robohydra/feature
COPY responses/ /robohydra/responses
COPY feature/remote-stubs/DAS /robohydra/plugins/DAS
WORKDIR /robohydra/feature/remote-stubs

RUN npm install robohydra

EXPOSE 4000

CMD [ "./node_modules/.bin/robohydra", "hydra.conf" ]
