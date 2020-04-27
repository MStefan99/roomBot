create table rooms (
	id                integer not null
		constraint rooms_pk
			primary key autoincrement,
	server_id         integer not null
		constraint rooms_servers_id_fk
			references servers
			on update restrict on delete cascade,
	channel_snowflake text    not null,
	owner_snowflake   text    not null
);

create unique index rooms_channel_snowflake_uindex
	on rooms (channel_snowflake);

create unique index rooms_id_uindex
	on rooms (id);



