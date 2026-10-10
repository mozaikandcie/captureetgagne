-- Le type de notification « badge » est ajouté (V2).
alter table notifications drop constraint notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in ('defi','refus','com','rang','badge'));
