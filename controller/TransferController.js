// controller/TransferController.js
const InterCenterTransfer = require("../model/interCenterTransfer");
const Inventory = require("../model/inventory");
const Part = require("../model/parts");
const ServiceCenter = require("../model/serviceCenter");
const mongoose = require("mongoose");
const {
    createPagination,
    createPaginatedResponse,
    validatePagination,
} = require("../utils/pagination");

// 1. Xem danh sách phụ tùng có sẵn ở các trung tâm khác


// 2. Gửi request chuyển phụ tùng từ trung tâm A sang trung tâm B
exports.createTransferRequest = async (req, res) => {
    try {
        const { from_center_id, to_center_id, items } = req.body;
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        // Validate input
        if (!to_center_id || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Thiếu thông tin bắt buộc: to_center_id và items",
                success: false,
            });
        }

        // Lấy service center của user hiện tại (trung tâm A)
        // Nếu có from_center_id trong request, dùng nó, nếu không thì tìm theo user_id
        let fromCenter;
        if (from_center_id) {
            fromCenter = await ServiceCenter.findById(from_center_id);
            if (!fromCenter) {
                return res.status(404).json({
                    message: "Không tìm thấy trung tâm nguồn (from_center_id)",
                    success: false,
                });
            }
        } else {
            // Tìm service center theo user_id
            fromCenter = await ServiceCenter.findOne({ user_id: userId });
            if (!fromCenter) {
                return res.status(404).json({
                    message: "Không tìm thấy service center của bạn. Vui lòng cung cấp from_center_id trong request body.",
                    success: false,
                });
            }
        }

        // Kiểm tra trung tâm B có tồn tại không
        const toCenter = await ServiceCenter.findById(to_center_id);
        if (!toCenter) {
            return res.status(404).json({
                message: "Không tìm thấy trung tâm đích",
                success: false,
            });
        }

        // Không cho gửi request cho chính mình
        if (fromCenter._id.toString() === to_center_id.toString()) {
            return res.status(400).json({
                message: "Không thể gửi request cho chính trung tâm của bạn",
                success: false,
            });
        }

        // Validate items
        for (const item of items) {
            if (!item.part_id || !item.quantity || item.quantity < 1) {
                return res.status(400).json({
                    message: "Mỗi item phải có part_id và quantity >= 1",
                    success: false,
                });
            }

            // Kiểm tra part có tồn tại không
            const part = await Part.findById(item.part_id);
            if (!part) {
                return res.status(404).json({
                    message: `Không tìm thấy part với ID: ${item.part_id}`,
                    success: false,
                });
            }
        }

        // Tạo transfer request
        const transferRequest = new InterCenterTransfer({
            from_center_id: fromCenter._id,
            to_center_id: to_center_id,
            items: items,
            status: "pending",
        });

        await transferRequest.save();

        // Populate để trả về đầy đủ thông tin
        const populatedRequest = await InterCenterTransfer.findById(
            transferRequest._id
        )
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice");

        return res.status(201).json({
            message: "Gửi request chuyển phụ tùng thành công",
            success: true,
            data: populatedRequest,
        });
    } catch (error) {
        console.error("Create transfer request error:", error);
        return res.status(500).json({
            message: "Lỗi tạo request chuyển phụ tùng",
            error: error.message,
            success: false,
        });
    }
};

// 3. Xem danh sách request nhận được (trung tâm B xem các request từ trung tâm khác)
exports.getReceivedTransferRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, center_id } = req.query;
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        const { page: validatedPage, limit: validatedLimit } = validatePagination(
            page,
            limit
        );

        // Lấy service center - ưu tiên từ query, nếu không có thì tìm theo user_id
        let toCenterId;
        if (center_id) {
            const center = await ServiceCenter.findById(center_id);
            if (!center) {
                return res.status(404).json({
                    message: "Không tìm thấy service center với center_id được cung cấp",
                    success: false,
                });
            }
            toCenterId = center._id;
        } else {
            const userCenter = await ServiceCenter.findOne({ user_id: userId });
            if (!userCenter) {
                // Nếu không tìm thấy service center, trả về empty array
                const emptyPagination = createPagination(validatedPage, validatedLimit, 0);
                return res.status(200).json({
                    message: "Không tìm thấy service center của bạn. Vui lòng cung cấp center_id trong query.",
                    success: true,
                    data: {
                        items: [],
                        pagination: emptyPagination,
                    },
                });
            }
            toCenterId = userCenter._id;
        }

        const query = {
            to_center_id: toCenterId, // Chỉ lấy request gửi đến trung tâm này
        };

        if (status) {
            query.status = status;
        }

        const total = await InterCenterTransfer.countDocuments(query);
        const pagination = createPagination(validatedPage, validatedLimit, total);

        const requests = await InterCenterTransfer.find(query)
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice")
            .populate("counter_offer_items.part_id", "part_name part_number supplier costPrice sellPrice")
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean();

        const response = createPaginatedResponse(
            requests,
            pagination,
            "Lấy danh sách request nhận được thành công"
        );

        return res.status(200).json(response);
    } catch (error) {
        console.error("Get received transfer requests error:", error);
        return res.status(500).json({
            message: "Lỗi lấy danh sách request nhận được",
            error: error.message,
            success: false,
        });
    }
};

// 4. Xem danh sách request đã gửi (trung tâm A xem các request mình đã gửi)
exports.getSentTransferRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, center_id } = req.query;
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        const { page: validatedPage, limit: validatedLimit } = validatePagination(
            page,
            limit
        );

        // Lấy service center - ưu tiên từ query, nếu không có thì tìm theo user_id
        let fromCenterId;
        if (center_id) {
            const center = await ServiceCenter.findById(center_id);
            if (!center) {
                return res.status(404).json({
                    message: "Không tìm thấy service center với center_id được cung cấp",
                    success: false,
                });
            }
            fromCenterId = center._id;
        } else {
            const userCenter = await ServiceCenter.findOne({ user_id: userId });
            if (!userCenter) {
                // Nếu không tìm thấy service center, trả về empty array
                const emptyPagination = createPagination(validatedPage, validatedLimit, 0);
                return res.status(200).json({
                    message: "Không tìm thấy service center của bạn. Vui lòng cung cấp center_id trong query.",
                    success: true,
                    data: {
                        items: [],
                        pagination: emptyPagination,
                    },
                });
            }
            fromCenterId = userCenter._id;
        }

        const query = {
            from_center_id: fromCenterId, // Chỉ lấy request từ trung tâm này
        };

        if (status) {
            query.status = status;
        }

        const total = await InterCenterTransfer.countDocuments(query);
        const pagination = createPagination(validatedPage, validatedLimit, total);

        const requests = await InterCenterTransfer.find(query)
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice")
            .populate("counter_offer_items.part_id", "part_name part_number supplier costPrice sellPrice")
            .sort({ createdAt: -1 })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean();

        const response = createPaginatedResponse(
            requests,
            pagination,
            "Lấy danh sách request đã gửi thành công"
        );

        return res.status(200).json(response);
    } catch (error) {
        console.error("Get sent transfer requests error:", error);
        return res.status(500).json({
            message: "Lỗi lấy danh sách request đã gửi",
            error: error.message,
            success: false,
        });
    }
};

// 5. Xử lý request (trung tâm B: chấp nhận/từ chối/đề xuất thay thế)
exports.processTransferRequest = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { action, counter_offer_items, notes } = req.body;
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        if (!transferId || !action) {
            return res.status(400).json({
                message: "Thiếu transferId hoặc action",
                success: false,
            });
        }

        // Lấy transfer request trước
        const transferRequest = await InterCenterTransfer.findById(transferId)
            .populate("items.part_id")
            .populate("to_center_id");

        if (!transferRequest) {
            return res.status(404).json({
                message: "Không tìm thấy transfer request",
                success: false,
            });
        }

        // Lấy to_center_id từ transfer request
        const toCenterId = transferRequest.to_center_id._id
            ? transferRequest.to_center_id._id
            : transferRequest.to_center_id;

        // Kiểm tra xem to_center có tồn tại không
        const toCenter = await ServiceCenter.findById(toCenterId);
        if (!toCenter) {
            return res.status(404).json({
                message: "Không tìm thấy service center đích",
                success: false,
            });
        }

        // Kiểm tra quyền: CHỈ owner của to_center mới được xử lý request
        // User phải là owner (user_id của to_center phải trùng với userId hiện tại)
        if (!toCenter.user_id) {
            return res.status(403).json({
                message: "Service center đích không có owner. Không thể xử lý request.",
                success: false,
            });
        }

        if (toCenter.user_id.toString() !== userId) {
            return res.status(403).json({
                message: "Bạn không có quyền xử lý request này. Chỉ owner của trung tâm đích (to_center) mới có quyền.",
                success: false,
            });
        }

        // Lấy userCenter để sử dụng trong các bước tiếp theo
        const userCenter = toCenter;

        // Kiểm tra status: chỉ xử lý được khi status là pending
        if (transferRequest.status !== "pending") {
            return res.status(400).json({
                message: `Request này đã được xử lý với status: ${transferRequest.status}`,
                success: false,
            });
        }

        let updateData = { notes };

        if (action === "accept") {
            // Chấp nhận: kiểm tra kho có đủ không
            const insufficientItems = [];

            for (const item of transferRequest.items) {
                const inventory = await Inventory.findOne({
                    center_id: userCenter._id,
                    part_id: item.part_id._id,
                });

                if (!inventory || inventory.quantity_avaiable < item.quantity) {
                    insufficientItems.push({
                        part_id: item.part_id._id,
                        part_name: item.part_id.part_name,
                        requested: item.quantity,
                        available: inventory ? inventory.quantity_avaiable : 0,
                    });
                }
            }

            if (insufficientItems.length > 0) {
                return res.status(400).json({
                    message: "Kho không đủ số lượng yêu cầu",
                    success: false,
                    insufficient_items: insufficientItems,
                });
            }

            // Đủ hàng → chấp nhận
            updateData.status = "accepted";
        } else if (action === "reject") {
            // Từ chối
            updateData.status = "rejected";
        } else if (action === "counter_offer") {
            // Đề xuất thay thế
            if (!counter_offer_items || !Array.isArray(counter_offer_items)) {
                return res.status(400).json({
                    message: "Thiếu counter_offer_items khi action là counter_offer",
                    success: false,
                });
            }

            // Validate counter_offer_items
            for (const item of counter_offer_items) {
                if (!item.part_id || !item.quantity || !item.available_quantity) {
                    return res.status(400).json({
                        message:
                            "Mỗi counter_offer_item phải có part_id, quantity và available_quantity",
                        success: false,
                    });
                }

                // Kiểm tra part có tồn tại không
                const part = await Part.findById(item.part_id);
                if (!part) {
                    return res.status(404).json({
                        message: `Không tìm thấy part với ID: ${item.part_id}`,
                        success: false,
                    });
                }

                // Kiểm tra kho có đủ không
                const inventory = await Inventory.findOne({
                    center_id: userCenter._id,
                    part_id: item.part_id,
                });

                if (!inventory || inventory.quantity_avaiable < item.available_quantity) {
                    return res.status(400).json({
                        message: `Kho không đủ số lượng cho part: ${part.part_name}`,
                        success: false,
                    });
                }
            }

            updateData.status = "counter_offer";
            updateData.counter_offer_items = counter_offer_items;
        } else {
            return res.status(400).json({
                message: "Action không hợp lệ. Chỉ chấp nhận: accept, reject, counter_offer",
                success: false,
            });
        }

        // Cập nhật request
        const updatedRequest = await InterCenterTransfer.findByIdAndUpdate(
            transferId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice")
            .populate("counter_offer_items.part_id", "part_name part_number supplier costPrice sellPrice");

        return res.status(200).json({
            message: `Xử lý request thành công với action: ${action}`,
            success: true,
            data: updatedRequest,
        });
    } catch (error) {
        console.error("Process transfer request error:", error);
        return res.status(500).json({
            message: "Lỗi xử lý request",
            error: error.message,
            success: false,
        });
    }
};

// 6. Chấp thuận/hủy response từ trung tâm B (trung tâm A xử lý counter_offer)
exports.respondToCounterOffer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const { action } = req.body; // "approve" hoặc "reject"
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        if (!transferId || !action) {
            return res.status(400).json({
                message: "Thiếu transferId hoặc action",
                success: false,
            });
        }

        // Chấp nhận cả "approve"/"counter_accept" và "reject"/"counter_rejected" để tương thích
        const validAcceptActions = ["approve", "counter_accept"];
        const validRejectActions = ["reject", "counter_rejected"];

        if (!validAcceptActions.includes(action) && !validRejectActions.includes(action)) {
            return res.status(400).json({
                message: "Action chỉ chấp nhận: approve/counter_accept hoặc reject/counter_rejected",
                success: false,
            });
        }

        // Lấy transfer request trước
        const transferRequest = await InterCenterTransfer.findById(transferId)
            .populate("counter_offer_items.part_id")
            .populate("from_center_id");

        if (!transferRequest) {
            return res.status(404).json({
                message: "Không tìm thấy transfer request",
                success: false,
            });
        }

        // Kiểm tra quyền: chỉ trung tâm A (from_center_id) mới được xử lý counter_offer
        // Lấy from_center_id từ transfer request (có thể là object đã populate hoặc ObjectId)
        const fromCenterId = transferRequest.from_center_id._id
            ? transferRequest.from_center_id._id
            : transferRequest.from_center_id;

        // Kiểm tra xem user có quyền với center này không
        const fromCenter = await ServiceCenter.findById(fromCenterId);
        if (!fromCenter) {
            return res.status(404).json({
                message: "Không tìm thấy service center nguồn",
                success: false,
            });
        }

        // Kiểm tra quyền: CHỈ owner của from_center mới được xử lý counter_offer
        // User phải là owner (user_id của from_center phải trùng với userId hiện tại)
        if (!fromCenter.user_id) {
            return res.status(403).json({
                message: "Service center nguồn không có owner. Không thể xử lý counter offer.",
                success: false,
            });
        }

        if (fromCenter.user_id.toString() !== userId) {
            return res.status(403).json({
                message: "Bạn không có quyền xử lý counter offer này. Chỉ owner của trung tâm nguồn (from_center) mới có quyền.",
                success: false,
            });
        }

        // Kiểm tra status: chỉ xử lý được khi status là counter_offer
        if (transferRequest.status !== "counter_offer") {
            return res.status(400).json({
                message: `Request này không ở trạng thái counter_offer. Status hiện tại: ${transferRequest.status}`,
                success: false,
            });
        }

        let updateData = {};

        // Xác định status dựa trên action
        if (validAcceptActions.includes(action)) {
            updateData.status = "counter_accept";
        } else if (validRejectActions.includes(action)) {
            updateData.status = "counter_rejected";
        }

        // Cập nhật request
        const updatedRequest = await InterCenterTransfer.findByIdAndUpdate(
            transferId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice")
            .populate("counter_offer_items.part_id", "part_name part_number supplier costPrice sellPrice");

        const isAccept = validAcceptActions.includes(action);
        return res.status(200).json({
            message: `${isAccept ? "Chấp thuận" : "Từ chối"} counter offer thành công`,
            success: true,
            data: updatedRequest,
        });
    } catch (error) {
        console.error("Respond to counter offer error:", error);
        return res.status(500).json({
            message: "Lỗi xử lý counter offer",
            error: error.message,
            success: false,
        });
    }
};

// 7. Thực hiện chuyển kho (cập nhật inventory của cả 2 trung tâm)
exports.executeTransfer = async (req, res) => {
    try {
        const { transferId } = req.params;
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        if (!transferId) {
            return res.status(400).json({
                message: "Thiếu transferId",
                success: false,
            });
        }

        // Lấy transfer request trước
        const transferRequest = await InterCenterTransfer.findById(transferId)
            .populate("items.part_id")
            .populate("counter_offer_items.part_id")
            .populate("from_center_id")
            .populate("to_center_id");

        if (!transferRequest) {
            return res.status(404).json({
                message: "Không tìm thấy transfer request",
                success: false,
            });
        }

        // Lấy to_center_id từ transfer request
        const toCenterId = transferRequest.to_center_id._id
            ? transferRequest.to_center_id._id
            : transferRequest.to_center_id;

        // Kiểm tra xem to_center có tồn tại không
        const toCenter = await ServiceCenter.findById(toCenterId);
        if (!toCenter) {
            return res.status(404).json({
                message: "Không tìm thấy service center đích",
                success: false,
            });
        }

        // Kiểm tra quyền: CHỈ owner của to_center mới được thực hiện chuyển kho
        // User phải là owner (user_id của to_center phải trùng với userId hiện tại)
        if (!toCenter.user_id) {
            return res.status(403).json({
                message: "Service center đích không có owner. Không thể thực hiện chuyển kho.",
                success: false,
            });
        }

        if (toCenter.user_id.toString() !== userId) {
            return res.status(403).json({
                message: "Bạn không có quyền thực hiện chuyển kho này. Chỉ owner của trung tâm đích (to_center) mới có quyền.",
                success: false,
            });
        }

        // Lấy userCenter để sử dụng trong các bước tiếp theo
        const userCenter = toCenter;

        // Kiểm tra status: chỉ thực hiện được khi status là accepted hoặc counter_accept
        if (
            transferRequest.status !== "accepted" &&
            transferRequest.status !== "counter_accept"
        ) {
            return res.status(400).json({
                message: `Không thể thực hiện chuyển kho. Status hiện tại: ${transferRequest.status}`,
                success: false,
            });
        }

        // Xác định items cần chuyển
        let itemsToTransfer = [];
        if (transferRequest.status === "accepted") {
            // Dùng items gốc
            itemsToTransfer = transferRequest.items;
        } else if (transferRequest.status === "counter_accept") {
            // Dùng counter_offer_items khi đã accept counter offer
            itemsToTransfer = transferRequest.counter_offer_items.map((item) => ({
                part_id: item.part_id._id,
                quantity: item.quantity,
                supplier: item.supplier,
            }));
        }

        // Kiểm tra lại kho trước khi chuyển
        const insufficientItems = [];
        for (const item of itemsToTransfer) {
            const inventory = await Inventory.findOne({
                center_id: userCenter._id,
                part_id: item.part_id,
            });

            const availableQty =
                transferRequest.status === "counter_accept"
                    ? transferRequest.counter_offer_items.find(
                        (coi) => coi.part_id._id.toString() === item.part_id.toString()
                    )?.available_quantity || 0
                    : inventory?.quantity_avaiable || 0;

            if (!inventory || availableQty < item.quantity) {
                insufficientItems.push({
                    part_id: item.part_id,
                    requested: item.quantity,
                    available: availableQty,
                });
            }
        }

        if (insufficientItems.length > 0) {
            return res.status(400).json({
                message: "Kho không đủ số lượng để thực hiện chuyển kho",
                success: false,
                insufficient_items: insufficientItems,
            });
        }

        // Thực hiện chuyển kho
        const transferResults = [];

        for (const item of itemsToTransfer) {
            // Giảm số lượng ở trung tâm B (to_center_id)
            const fromInventory = await Inventory.findOne({
                center_id: userCenter._id,
                part_id: item.part_id,
            });

            if (fromInventory) {
                fromInventory.quantity_avaiable -= item.quantity;
                await fromInventory.save();
            }

            // Tăng số lượng ở trung tâm A (from_center_id)
            let toInventory = await Inventory.findOne({
                center_id: transferRequest.from_center_id._id,
                part_id: item.part_id,
            });

            if (toInventory) {
                // Nếu đã có inventory → tăng số lượng
                toInventory.quantity_avaiable += item.quantity;
                toInventory.last_restocked = new Date();
                await toInventory.save();
            } else {
                // Nếu chưa có inventory → tạo mới
                toInventory = new Inventory({
                    center_id: transferRequest.from_center_id._id,
                    part_id: item.part_id,
                    quantity_avaiable: item.quantity,
                    minimum_stock: 0,
                    last_restocked: new Date(),
                });
                await toInventory.save();
            }

            transferResults.push({
                part_id: item.part_id,
                quantity: item.quantity,
                from_inventory_id: fromInventory?._id,
                to_inventory_id: toInventory._id,
            });
        }

        // Cập nhật status của transfer request
        transferRequest.status = "completed";
        transferRequest.completed_at = new Date();
        await transferRequest.save();

        const populatedRequest = await InterCenterTransfer.findById(transferId)
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice")
            .populate("counter_offer_items.part_id", "part_name part_number supplier costPrice sellPrice");

        return res.status(200).json({
            message: "Chuyển kho thành công",
            success: true,
            data: {
                transfer_request: populatedRequest,
                transfer_results: transferResults,
            },
        });
    } catch (error) {
        console.error("Execute transfer error:", error);
        return res.status(500).json({
            message: "Lỗi thực hiện chuyển kho",
            error: error.message,
            success: false,
        });
    }
};

// 8. Hủy request (trung tâm A có thể hủy request đã gửi nếu chưa được xử lý)
exports.cancelTransferRequest = async (req, res) => {
    try {
        const { transferId } = req.params;
        const userId = req._id?.toString();

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
                success: false,
            });
        }

        if (!transferId) {
            return res.status(400).json({
                message: "Thiếu transferId",
                success: false,
            });
        }

        // Lấy transfer request trước
        const transferRequest = await InterCenterTransfer.findById(transferId)
            .populate("from_center_id");

        if (!transferRequest) {
            return res.status(404).json({
                message: "Không tìm thấy transfer request",
                success: false,
            });
        }

        // Lấy from_center_id từ transfer request
        const fromCenterId = transferRequest.from_center_id._id
            ? transferRequest.from_center_id._id
            : transferRequest.from_center_id;

        // Kiểm tra xem from_center có tồn tại không
        const fromCenter = await ServiceCenter.findById(fromCenterId);
        if (!fromCenter) {
            return res.status(404).json({
                message: "Không tìm thấy service center nguồn",
                success: false,
            });
        }

        // Kiểm tra quyền: CHỈ owner của from_center mới được hủy request
        // User phải là owner (user_id của from_center phải trùng với userId hiện tại)
        if (!fromCenter.user_id) {
            return res.status(403).json({
                message: "Service center nguồn không có owner. Không thể hủy request.",
                success: false,
            });
        }

        if (fromCenter.user_id.toString() !== userId) {
            return res.status(403).json({
                message: "Bạn không có quyền hủy request này. Chỉ owner của trung tâm nguồn (from_center) mới có quyền.",
                success: false,
            });
        }

        // Chỉ hủy được khi status là pending, counter_offer, hoặc counter_rejected
        const cancellableStatuses = ["pending", "counter_offer", "counter_rejected"];
        if (!cancellableStatuses.includes(transferRequest.status)) {
            return res.status(400).json({
                message: `Không thể hủy request với status: ${transferRequest.status}`,
                success: false,
            });
        }

        // Cập nhật status
        transferRequest.status = "cancelled";
        await transferRequest.save();

        const populatedRequest = await InterCenterTransfer.findById(transferId)
            .populate("from_center_id", "center_name address phone email")
            .populate("to_center_id", "center_name address phone email")
            .populate("items.part_id", "part_name part_number supplier costPrice sellPrice");

        return res.status(200).json({
            message: "Hủy request thành công",
            success: true,
            data: populatedRequest,
        });
    } catch (error) {
        console.error("Cancel transfer request error:", error);
        return res.status(500).json({
            message: "Lỗi hủy request",
            error: error.message,
            success: false,
        });
    }
};

