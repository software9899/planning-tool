# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build


# ---------- Production stage ----------
FROM nginx:alpine

# ลบ default.conf เก่า
RUN rm /etc/nginx/conf.d/default.conf

# copy build ของ frontend
COPY --from=build /app/dist /usr/share/nginx/html

# copy nginx config ใหม่
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
