#!/usr/bin/env Rscript

# Generate interactive Plotly visuals that support the reshoring narrative
# using the datasets in dataSets/. Outputs are saved to visuals/ as
# self-contained HTML fragments that can be dropped into the site via <iframe>.

required <- c("dplyr", "readr", "plotly", "readxl", "htmlwidgets", "tidyr")
missing <- required[!sapply(required, requireNamespace, quietly = TRUE)]
if (length(missing)) {
  stop("Install required packages before running: ", paste(missing, collapse = ", "))
}

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(plotly)
  library(readxl)
  library(htmlwidgets)
  library(tidyr)
})

# Resolve paths whether the script is run from repo root or dataSets/
project_root <- if (basename(normalizePath(".")) == "dataSets") normalizePath("..") else normalizePath(".")
data_dir <- file.path(project_root, "dataSets")
out_dir <- file.path(project_root, "visuals")
if (!dir.exists(out_dir)) dir.create(out_dir, recursive = TRUE)

palette <- list(accent = "#5ad1ff", accent2 = "#7aa7ff", neutral = "#6f7684", dark = "#0b1118")

excel_to_date <- function(x) {
  if (inherits(x, "Date")) return(as.Date(x))
  if (inherits(x, "POSIXt")) return(as.Date(x))
  if (is.numeric(x)) return(as.Date(as.numeric(x), origin = "1899-12-30"))
  suppressWarnings(as.Date(x))
}

load_gscpi <- function(path) {
  raw <- read_xls(path)
  names(raw) <- tolower(names(raw))
  if (ncol(raw) < 2) stop("Unexpected GSCPI format; expected a date and value column.")
  dates <- excel_to_date(raw[[1]])
  values <- as.numeric(raw[[2]])
  tibble(date = dates, gscpi = values) %>% drop_na()
}

load_series <- function() {
  ipman <- read_csv(file.path(data_dir, "IPMAN.csv"), show_col_types = FALSE) %>%
    transmute(date = as.Date(observation_date), ip_index = IPMAN)

  manemp <- read_csv(file.path(data_dir, "MANEMP.csv"), show_col_types = FALSE) %>%
    transmute(date = as.Date(observation_date), employment_thousands = MANEMP)

  merged <- full_join(ipman, manemp, by = "date") %>%
    arrange(date) %>%
    filter(!is.na(ip_index) | !is.na(employment_thousands))

  base_start <- as.Date("1990-01-01")
  start_date <- max(base_start, min(merged$date[!is.na(merged$ip_index) & !is.na(merged$employment_thousands)]))

  merged <- merged %>%
    filter(date >= start_date) %>%
    mutate(
      output_index = ip_index / first(ip_index) * 100,
      employment_index = employment_thousands / first(employment_thousands) * 100,
      output_per_worker = ip_index / employment_thousands,
      output_per_worker_index = output_per_worker / first(output_per_worker) * 100,
      yoy_output = (ip_index / lag(ip_index, 12) - 1) * 100,
      yoy_employment = (employment_thousands / lag(employment_thousands, 12) - 1) * 100
    )
  merged
}

save_plot <- function(plot, filename) {
  filepath <- file.path(out_dir, filename)
  libdir <- file.path(out_dir, paste0(tools::file_path_sans_ext(filename), "_files"))
  htmlwidgets::saveWidget(plot, filepath, selfcontained = TRUE, libdir = libdir)
  message("Saved ", filepath)
}

make_output_vs_employment <- function(df) {
  hover <- "<b>%{x|%b %Y}</b><br>%{fullData.name}: %{y:.1f}<extra></extra>"
  p <- plot_ly(df, x = ~date) %>%
    add_lines(y = ~output_index, name = "Output index (1990=100)", line = list(color = palette$accent, width = 3),
              hovertemplate = hover) %>%
    add_lines(y = ~employment_index, name = "Employment index (1990=100)", line = list(color = palette$accent2, width = 3),
              hovertemplate = hover) %>%
    layout(
      title = "Manufacturing output has decoupled from employment (1990–present)",
      xaxis = list(title = "Date"),
      yaxis = list(title = "Index"),
      legend = list(orientation = "h", x = 0.02, y = 1.08),
      template = "plotly_dark",
      annotations = list(
        list(
          x = max(df$date, na.rm = TRUE),
          y = tail(df$output_index, 1),
          text = "Automation + AI gains",
          ax = -40, ay = -40, arrowcolor = palette$accent, showarrow = TRUE, font = list(size = 11)
        ),
        list(
          x = max(df$date, na.rm = TRUE),
          y = tail(df$employment_index, 1),
          text = "Job-light growth",
          ax = -40, ay = 40, arrowcolor = palette$accent2, showarrow = TRUE, font = list(size = 11)
        )
      )
    )
  p
}

make_productivity_plot <- function(df) {
  hover <- "<b>%{x|%b %Y}</b><br>Output per worker index: %{y:.1f}<extra></extra>"
  p <- plot_ly(df, x = ~date) %>%
    add_lines(y = ~output_per_worker_index, name = "Output per worker (1972=100)",
              line = list(color = palette$accent, width = 3),
              hovertemplate = hover, fill = "tozeroy", fillcolor = "rgba(90,209,255,0.20)") %>%
    layout(
      title = "AI-enabled productivity lifts output per worker",
      xaxis = list(title = "Date"),
      yaxis = list(title = "Index"),
      template = "plotly_dark",
      annotations = list(
        list(
          x = df$date[which.max(df$output_per_worker_index)],
          y = max(df$output_per_worker_index, na.rm = TRUE),
          text = "Rising productivity makes domestic labor cost competitive",
          ax = 0, ay = -60, arrowcolor = palette$accent, showarrow = TRUE, font = list(size = 11)
        )
      )
    )
  p
}

make_supply_pressure_plot <- function(gscpi) {
  hover <- "<b>%{x|%b %Y}</b><br>GSCPI: %{y:.2f}<extra></extra>"
  p <- plot_ly(gscpi, x = ~date) %>%
    add_trace(y = ~gscpi, type = "scatter", mode = "lines",
              name = "Global Supply Chain Pressure Index",
              line = list(color = palette$neutral, width = 2),
              fill = "tozeroy", fillcolor = "rgba(111,118,132,0.35)",
              hovertemplate = hover) %>%
    add_trace(y = rep(0, nrow(gscpi)), x = gscpi$date, type = "scatter", mode = "lines",
              showlegend = FALSE, line = list(color = palette$dark, width = 1)) %>%
    layout(
      title = "Supply chain pressure spikes create option value for reshoring",
      xaxis = list(title = "Date"),
      yaxis = list(title = "Index (0 = balanced)"),
      template = "plotly_dark",
      shapes = list(
        list(type = "rect", x0 = min(gscpi$date), x1 = max(gscpi$date),
             y0 = 1, y1 = max(gscpi$gscpi, na.rm = TRUE),
             fillcolor = "rgba(154,252,106,0.10)", line = list(width = 0)),
        list(type = "rect", x0 = min(gscpi$date), x1 = max(gscpi$date),
             y0 = min(gscpi$gscpi, na.rm = TRUE), y1 = -1,
             fillcolor = "rgba(90,209,255,0.10)", line = list(width = 0))
      ),
      annotations = list(
        list(x = median(gscpi$date), y = 1.4, text = "High pressure: long lead times, volatility",
             showarrow = FALSE, font = list(size = 11, color = palette$accent2)),
        list(x = median(gscpi$date), y = -0.9, text = "Slack: reshored capacity can absorb shocks",
             showarrow = FALSE, font = list(size = 11, color = palette$accent))
      )
    )
  p
}

series <- load_series()
save_plot(make_output_vs_employment(series), "output_vs_employment_1990.html")
save_plot(make_productivity_plot(series), "output_per_worker_trend.html")

gscpi <- tryCatch(
  load_gscpi(file.path(data_dir, "gscpi_data.xls")),
  error = function(e) {
    message("Skipping GSCPI plot: ", e$message)
    NULL
  }
)

if (!is.null(gscpi)) {
  save_plot(make_supply_pressure_plot(gscpi), "gscpi_pressure.html")
} else {
  message("GSCPI output not generated; convert gscpi_data.xls to a readable CSV/XLSX to enable.")
}

message("Done. Embed the visuals from visuals/ with <iframe src=\"visuals/<file>.html\" ...></iframe>.")
