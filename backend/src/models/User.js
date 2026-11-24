
const mongoose = require("mongoose");

const USER_ROLES = ["requester", "provider", "volunteer", "admin"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false,
    },

    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpires: {
      type: Date,
      select: false,
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    // Legacy single-role field retained during the compatibility migration.
    // It mirrors activeRole so older controllers and populated documents keep working.
    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      default: "requester",
    },

    // All capabilities assigned to this account.
    // Undefined default allows legacy records to be normalized from their existing role.
    roles: {
      type: [
        {
          type: String,
          enum: USER_ROLES,
        },
      ],
      default: undefined,
    },

    // The dashboard currently selected by the user.
    activeRole: {
      type: String,
      enum: USER_ROLES,
    },
  },
  {
    timestamps: true,
  }
);

// Keep legacy records and older code compatible while roles are introduced.
// Existing documents with only the role field are interpreted as having that one role.
userSchema.pre("validate", function () {
  if (!Array.isArray(this.roles) || this.roles.length === 0) {
    this.roles = [this.role || this.activeRole || "requester"];
  } else {
    this.roles = [...new Set(this.roles)];
  }

  if (!this.activeRole || !this.roles.includes(this.activeRole)) {
    this.activeRole = this.roles.includes(this.role)
      ? this.role
      : this.roles[0];
  }

  // Preserve the old field as an alias for the currently active dashboard.
  this.role = this.activeRole;

});

const User = mongoose.model("User", userSchema);

module.exports = User;
