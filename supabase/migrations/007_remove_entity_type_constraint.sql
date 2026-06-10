-- Remove the check constraint entirely to allow dynamic entity types
alter table entities drop constraint if exists entities_type_check;
