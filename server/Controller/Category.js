const Category = require("../Model/Category");

// Utility: Get random int
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// Ensure Default Category Exists
async function ensureDefaultCategory() {
  let defaultCategory = await Category.findOne({ name: "General" });
  if (!defaultCategory) {
    defaultCategory = await Category.create({
      name: "General",
      description: "Default category for uncategorized courses",
      courses: [],
    });
    console.log("✅ Default category created!");
  }
  return defaultCategory;
}

// ==============================
// Create Category
// ==============================
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const categoryDetails = await Category.create({
      name,
      description,
    });

    console.log(categoryDetails);

    return res.status(200).json({
      success: true,
      message: "Category Created Successfully",
      data: categoryDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// Show All Categories
// ==============================
exports.showAllCategories = async (req, res) => {
  try {
    await ensureDefaultCategory(); // make sure default exists

    const allCategories = await Category.find().populate("courses");

    // If you want only published ones → uncomment this filter
    // const categoriesWithPublishedCourses = allCategories.filter((category) =>
    //   category.courses.some((course) => course.status === "Published")
    // );

    res.status(200).json({
      success: true,
      data: allCategories, // change to categoriesWithPublishedCourses if filtering
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// Category Page Details
// ==============================
exports.categoryPageDetails = async (req, res) => {
  try {
    const { categoryId } = req.body;

    const selectedCategory = await Category.findById(categoryId)
      .populate({
        path: "courses",
        match: { status: "Published" },
        populate: "ratingAndReviews",
      })
      .exec();

    if (!selectedCategory) {
      console.log("Category not found.");
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    if (selectedCategory.courses.length === 0) {
      console.log("No courses found for the selected category.");
      return res.status(200).json({
        success: true,
        message: "No courses found for the selected category.",
        data: { selectedCategory },
      });
    }

    // find different category
    const categoriesExceptSelected = await Category.find({
      _id: { $ne: categoryId },
    });

    let differentCategory = null;
    if (categoriesExceptSelected.length > 0) {
      const randomCategoryId =
        categoriesExceptSelected[getRandomInt(categoriesExceptSelected.length)]
          ._id;
      differentCategory = await Category.findById(randomCategoryId)
        .populate({
          path: "courses",
          match: { status: "Published" },
        })
        .exec();
    }

    // find most selling courses
    const allCategories = await Category.find()
      .populate({
        path: "courses",
        match: { status: "Published" },
      })
      .exec();

    const allCourses = allCategories.flatMap((category) => category.courses);
    const mostSellingCourses = allCourses
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        selectedCategory,
        differentCategory,
        mostSellingCourses,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
