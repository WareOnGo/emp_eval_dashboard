import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const q = async (label, sql) => { const { rows } = await c.query(sql); console.log(`\n### ${label}`); console.table(rows); };
const NORM = `lower(btrim(regexp_replace(w."googleLocation",'^https?://(www\\.)?','')))`;

await q("link-reuse population (ignores geocoding entirely)", `
  with p as (select w.id, ${NORM} as link, lower(btrim(w.city)) city, w."uploadedBy"
             from "Warehouse" w
             where w."googleLocation" is not null and btrim(w."googleLocation")<>''),
  g as (select link, count(*) size, count(distinct city) cities from p group by 1)
  select (select count(*) from p) as rows_with_link,
         count(*) filter (where size>1) as reused_links,
         coalesce(sum(size-1) filter (where size>1 and cities=1),0) as same_city_excess,
         count(*) filter (where size>1 and cities=1) as same_city_groups,
         coalesce(sum(size) filter (where size>1 and cities>1),0) as multi_city_rows,
         count(*) filter (where size>1 and cities>1) as multi_city_groups
  from g`);

await q("worst multi-city reused links", `
  with p as (select ${NORM} as link, lower(btrim(w.city)) city, w.state, w."uploadedBy"
             from "Warehouse" w
             where w."googleLocation" is not null and btrim(w."googleLocation")<>'')
  select left(link, 42) as link, count(*) rows, count(distinct city) cities,
         count(distinct state) states, count(distinct "uploadedBy") uploaders,
         string_agg(distinct city, ', ' order by city) as city_list
  from p group by link having count(distinct city) > 1
  order by count(*) desc limit 8`);

await q("geocoded coverage of the reused-link rows", `
  with p as (select w.id, ${NORM} as link, lower(btrim(w.city)) city, d.latitude
             from "Warehouse" w left join "WarehouseData" d on d."warehouseId"=w.id
             where w."googleLocation" is not null and btrim(w."googleLocation")<>''),
  g as (select link, count(*) size, count(distinct city) cities from p group by 1)
  select count(*) as multi_city_rows,
         count(*) filter (where p.latitude is not null) as of_which_geocoded,
         count(*) filter (where p.latitude is null) as not_geocoded
  from p join g on g.link=p.link where g.size>1 and g.cities>1`);
await c.end();
