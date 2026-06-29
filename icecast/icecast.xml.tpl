<icecast>
  <location>Ireland</location>
  <admin>${ICECAST_ADMIN_EMAIL}</admin>

  <limits>
    <clients>100</clients>
    <sources>2</sources>
    <queue-size>524288</queue-size>
    <client-timeout>30</client-timeout>
    <header-timeout>15</header-timeout>
    <source-timeout>10</source-timeout>
    <burst-on-connect>1</burst-on-connect>
    <burst-size>65536</burst-size>
  </limits>

  <authentication>
    <source-password>${ICECAST_SOURCE_PASSWORD}</source-password>
    <relay-password>${ICECAST_SOURCE_PASSWORD}</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>${ICECAST_ADMIN_PASSWORD}</admin-password>
  </authentication>

  <hostname>${ICECAST_HOSTNAME}</hostname>

  <listen-socket>
    <port>8000</port>
  </listen-socket>

  <http-headers>
    <header name="Access-Control-Allow-Origin" value="*" />
  </http-headers>

  <mount type="default">
    <public>0</public>
  </mount>

  <paths>
    <logdir>/var/log/icecast</logdir>
    <webroot>/usr/share/icecast/web</webroot>
    <adminroot>/usr/share/icecast/admin</adminroot>
    <alias source="/" destination="/status.xsl" />
  </paths>

  <logging>
    <accesslog>access.log</accesslog>
    <errorlog>error.log</errorlog>
    <loglevel>3</loglevel>
  </logging>

  <security>
    <chroot>0</chroot>
    <changeowner>
      <user>icecast</user>
      <group>icecast</group>
    </changeowner>
  </security>
</icecast>
