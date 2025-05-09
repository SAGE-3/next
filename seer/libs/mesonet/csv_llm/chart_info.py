import json


chart_decision_tree = {
    # "Column Histogram": "Distribution -> One Variable -> Few Data Points -> Column Histogram",
    # "Scatter Chart": "Distribution -> Two Variables -> Scatter Chart",
    # "Boxplot": "Composition -> one variable -> Boxplot",
    # "3D Area Chart": "Distribution -> Three Variables -> 3D Area Chart",
    # "Bubble Chart": "Relationship -> Three Variable -> Bubble Chart",
    # "Bubble Chart 4": "Relationship -> Three Variable -> Bubble Chart",
    # "Variable Width Column Chart": "Comparison -> Among Items -> Two Variables Per Item -> Variable Width Column Chart",
    # "Bar Chart": "Comparison -> Among Items -> One Variables Per Item -> Few Categories -> Many Items -> Bar Chart",
    # "Column Chart": "Comparison -> Among Items -> One Variables Per Item -> Few Categories -> Few Items -> Column Chart",
    # "Circular Area Chart": "Comparison -> Over Time -> Many Periods -> Cyclical Data -> Circular Area Chart",
    # "Column Chart": "Comparison -> Over Time -> Few Periods -> Singlshow me or Few Categories -> Column Chart",
    "Line Chart": "Comparison -> Over Time -> Few Periods -> Many Categories -> Line Chart",
    # "Stacked 100% Column Chart": "Composition -> Changing Over Time -> Few Periods -> Only Relative Differences Matter -> Stacked 100% Column Chart",
    # "Stacked Column Chart": "Composition -> Changing Over Time -> Few Periods -> Relative and Absolute Differences Matter -> Stacked Column Chart",
    # "Stacked 100% Area Chart": "Composition -> Changing Over Time -> Many Periods -> Only Relative Differences Matter -> Stacked 100% Area Chart",
    # "Stacked Area Chart": "Composition -> Changing Over Time -> Many Periods-> Relative and Absolute Differences Matter -> Stacked Area Chart",
    # "Pie Chart": "Composition -> Static -> Sample Share of Total -> Pie Chart",
    # "Waterfall Chart": "Composition -> Static -> Accumulation or Subtraction to Total -> Waterfall Chart",
    # "Stacked 100% Column Chart with SubComponents": "Composition -> Static -> Components of Components -> Stacked 100% Column Chart with SubComponents",
}

chart_info = {
  # "Variable Width Column Chart": {
  #   "description": "two variables per item",
  #   "attribute_counts": {"categorical": 1, "numerical": 2},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used as column label",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on X-axis",
  #     },
  #   ],
  #   "example":
  #     "Budgeting: expense type (categorical), amount spent (numerical), percentage of amount spend based on total budget (numerical)",
  # },
  # "Bar Chart": {
  #   "description": "many items",
  #   "attribute_counts": {"categorical": 1, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on Y-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on X-axis/series",
  #     },
  #   ],
  #   "example":
  #     "GPU performance comparison: GPU model (categorical), performance (numerical)",
  # },
  # "Column Chart": {
  #   "description": "few items/single or few categories",
  #   "attribute_counts": {"categorical": 2, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "categorical",
  #       "notes": "Used on column label",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #   ],
  #   "example":
  #     "Comparing product sales by year: products (categorical), sales (numerical), year (categorical)",
  # },
  # "Circular Area Chart": {
  #   "description": "cyclical data",
  #   "attribute_counts": {"categorical": 2, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on indicator (arranges data in a circle)",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used in series",
  #     },
  #     {
  #       "type": "categorical",
  #       "notes": "Used in series",
  #     },
  #   ],
  #   "example":
  #     "Temperatures in a year in different cities: months (categorical), temperature (numerical), city (categorical)",
  # },
  "Line Chart": {
    "description": "non-cyclical data/many categories",
    "attribute_counts": {"categorical": 1, "numerical": 1},
    "attributes": [
      {
        "type": "categorical",
        "notes": "Used on X-axis",
      },
      {
        "type": "numerical",
        "notes": "Used on Y-axis/series",
      },
    ],
    "example":
      "Bacteria growth over time: time (categorical), bacteria count (numerical)",
  },
  # "Column Histogram": {
  #   "description": "distribution of data",
  #   "attribute_counts": {"categorical": 1, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis",
  #     },
  #   ],
  #   "example":
  #     "Distribution of student grades: grade (numerical), number of students (categorical)",
  # },
  
  # "Scatter Chart": {
  #   "description": "two variables distribution/relationship",
  #   "attribute_counts": {"categorical": 1, "numerical": 2},
  #   "attributes": [
  #     {
  #       "type": "numerical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis",
  #     },
  #     {
  #       "type": "categorical",
  #       "notes": "Used for labeling the points",
  #     },
  #   ],
  #   "example": "Weight and height: weight (numerical), height (numerical)",
  # },
  # "3D Area Chart": {
  #   "description": "three variables",
  #   "attribute_counts": {"categorical": 0, "numerical": 3},
  #   "attributes": [
  #     {
  #       "type": "numerical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Z-axis",
  #     },
  #   ],
  #   "example":
  #     "Latitude, Longitude, Earthquake Intensity: latitude (numerical), longitude (numerical), intensity (numerical)",
  # },
  # "Stacked 100% Column Chart with Subcomponents": {
  #   "description": "component of components",
    
  # },
  # "Waterfall Chart": {
  #   "description": "accumulation or subtraction to total",
  #   "attribute_counts": {"categorical": 1, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on column label",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis",
  #     },
  #   ],
  #   "example":
  #     "Inventory audit of t-shirts showing numbers damaged and refurbished: t-shirt status such as damaged or refurbished (categorical), number of t-shirts (numerical)",
  # },
  # "Pie Chart": {
  #   "description": "To show the distribution of a climate variable across multiple stations",
  #   "attribute_counts": {"numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "numerical",
  #       "notes": "Used in series",
  #     },
  #   ],
  #   "example": "total rainfall (numerical)",
  # },
  #   "Boxplot": {
  #   "description": "To show the distributions of one variable for multiple categories",
  #   "attribute_counts": {"numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "numerical",
  #       "notes": "Used in series",
  #     },
  #   ],
  #   "example": "rainfall (numerical) for station 1 2 and 3",
  # },
  # "Stacked Area Chart": {
  #   "description": "relative and absolute differences matter (many periods)",
  #   "attribute_counts": {"categorical": 1, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #   ],
  #   "example":
  #     "Product sales from x,y,z companies over time: time (categorical), sales (numerical)",
  # },
  # "Stacked 100% Area Chart": {
  #   "description": "only relative differences matter (many periods)",
  #   "attribute_counts": {"categorical": 1, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #   ],
  #   "example":
  #     "Occupations in the US over time: time (categorical), occupation (categorical)",
  # },
  # "Stacked Column Chart": {
  #   "description": "relative and absolute differences matter (few periods)",
  #   "attribute_counts": {"categorical": 1, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #   ],
  #   "example":
  #     "Expenses from x, y, z departments in each quarter: quarter (categorical), expenses per department (numerical)",
  # },
  # "Stacked 100% Column Chart": {
  #   "description": "only relative differences matter (few periods)",
  #   "attribute_counts": {"categorical": 2, "numerical": 1},
  #   "attributes": [
  #     {
  #       "type": "categorical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "categorical",
  #       "notes": "used on column labels"
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #   ],
  #   "example":
  #     "Occupations in the US: occupation (categorical), percentage of total (numerical)",
  # },
  # "Bubble Chart": {
  #   "description": "three variables",
  #   "attribute_counts": {"categorical": 0, "numerical": 3},
  #   "attributes": [
  #     {
  #       "type": "numerical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on bubble size",
  #     },
  #   ],
  #   "example":
  #     "Relationship between rent, income, population for different cities: rent (numerical), income (numerical), population (numerical)",
  # },
  # "Bubble Chart 4": {
  #   "description": "four variables",
  #   "attribute_counts": {"categorical": 0, "numerical": 4},
  #   "attributes": [
  #     {
  #       "type": "numerical",
  #       "notes": "Used on X-axis",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on Y-axis/series",
  #     },
  #     {
  #       "type": "numerical",
  #       "notes": "Used on bubble size",
  #     },
  #     {
  #       "type": "categorical",
  #       "notes": "Used on bubble color/label",
  #     },
  #   ],
  #   "example":
  #     "Relationship between rent, income, population for different cities: rent (numerical), income (numerical), population (numerical)",
  # },
}


def chart_info_filter(attributes):
    if attributes == None:
        return chart_info, "\n".join(chart_decision_tree.values())

    scoped_charts = {key:value for key, value in chart_info.items() }
    # print("****scoped charts*****", scoped_charts)
    scoped_charts_instructions = "\n".join([chart_decision_tree[key] for key in scoped_charts.keys()])
    return (scoped_charts, scoped_charts_instructions)


def chart_info_filter_type_scoped(attributes, csv_context_scoped):
    if attributes == None:
        return chart_info, "\n".join(chart_decision_tree.values())
    # if len(csv_context_scoped) == 0:
    #   return [], ""

    csv_context_scoped = [column for column in csv_context_scoped if column["Column Name"] in attributes]
    csv_categoricals = [attribute for attribute in csv_context_scoped if attribute["Data Type"]=="Categorical"]
    csv_numericals = [attribute for attribute in csv_context_scoped if attribute["Data Type"]!="Categorical"]
    
    # scoped_charts = {key:value for key, value in chart_info.items() if len(csv_categoricals) == sum(1 for item in value.get("attributes", []) if item['type'] == 'categorical') and len(csv_numericals) == sum(1 for item in value.get("attributes", []) if item['type'] == 'numerical')}
    scoped_charts = {key:value for key, value in chart_info.items() if len(csv_categoricals) == value.get("attribute_counts", {}).get("categorical", -1) and len(csv_numericals) == value.get("attribute_counts", {}).get("numerical", -1)}
    # scoped_charts_instructions = "\n".join([chart_decision_tree[key] for key in scoped_charts.keys()])
    scoped_charts_instructions = json.dumps({key: {"description": chart_info[key]["description"], "example": chart_info[key]["example"]} for key in scoped_charts.keys()}, indent=2)
    # print(scoped_charts_instructions)
    return (scoped_charts, scoped_charts_instructions)


# print(json.dumps(chart_info_filter(["Car",f "Price"])[0], indent=2))
# print(chart_info_filter(["Car", "Price"])[1])