FROM trinodb/trino:462

COPY config.properties /etc/trino/config.properties
COPY node.properties /etc/trino/node.properties
COPY jvm.config /etc/trino/jvm.config
COPY catalog /etc/trino/catalog

EXPOSE 8080
