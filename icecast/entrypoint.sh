#!/bin/sh
set -e
sed \
  -e "s|\${ICECAST_SOURCE_PASSWORD}|$ICECAST_SOURCE_PASSWORD|g" \
  -e "s|\${ICECAST_ADMIN_PASSWORD}|$ICECAST_ADMIN_PASSWORD|g" \
  -e "s|\${ICECAST_ADMIN_EMAIL}|$ICECAST_ADMIN_EMAIL|g" \
  -e "s|\${ICECAST_HOSTNAME}|$ICECAST_HOSTNAME|g" \
  /tmp/icecast.xml.tpl > /etc/icecast.xml
exec icecast -c /etc/icecast.xml
