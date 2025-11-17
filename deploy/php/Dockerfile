FROM php:8.3-fpm-alpine
# system deps + PHP extensions for Laravel + Postgres
RUN apk add --no-cache git unzip zip libpq-dev oniguruma-dev icu-dev bash curl \
 && docker-php-ext-configure intl \
 && docker-php-ext-install pdo pdo_pgsql mbstring intl
# install Composer inside the container
RUN php -r "copy('https://getcomposer.org/installer','composer-setup.php');" \
 && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
 && rm composer-setup.php