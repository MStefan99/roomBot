create table room_users
(
    room_id integer not null
        constraint room_users_rooms_id_fk
            references rooms
            on update restrict on delete cascade,
    user_snowflake text not null
);

