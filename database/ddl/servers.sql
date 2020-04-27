create table servers (
	id                 integer not null
		constraint servers_pk
			primary key autoincrement,
	snowflake          text    not null,
	channel_snowflake  text,
	category_snowflake text
);

create unique index servers_category_snowflake_uindex
	on servers (category_snowflake);

create unique index servers_id_uindex
	on servers (id);

create unique index servers_snowflake_uindex
	on servers (snowflake);

