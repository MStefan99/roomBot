create table general
(
    key text not null
        constraint general_pk
            primary key,
    value text not null
);

create unique index general_key_uindex
    on general (key);

