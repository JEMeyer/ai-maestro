#!/bin/sh

# Function to replace placeholders with environment variables
replace_placeholders() {
  local file=$1
  sed -i "s|REACT_APP_OAUTH_URL_PLACEHOLDER|${REACT_APP_OAUTH_URL}|g" $file
  sed -i "s|REACT_APP_OAUTH_CLIENT_ID_PLACEHOLDER|${REACT_APP_OAUTH_CLIENT_ID}|g" $file
  sed -i "s|REACT_APP_API_BASE_URL_PLACEHOLDER|${REACT_APP_API_BASE_URL}|g" $file
}

# Replace placeholders in all HTML and JS files
for file in /usr/share/nginx/html/index.html /usr/share/nginx/html/static/js/*.js; do
  replace_placeholders $file
done

# Start NGINX
nginx -g "daemon off;"
